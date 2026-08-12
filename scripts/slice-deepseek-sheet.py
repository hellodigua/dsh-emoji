#!/usr/bin/env python3
"""把已登记的 DeepSeek 鲸鱼表情总览图切成透明 PNG。"""

from __future__ import annotations

import argparse
from collections import deque
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


SOURCE_SIZE = (1254, 1254)
SOURCE_SHA256 = "3b87fa433ca1ab058a4dcbc020f7e6d8e6c174a1c3587d649a2020544b67e3be"
# 128px 足够覆盖行内 2em 的高分屏显示，也避免把约 150px 的截图主体无意义放大。
OUTPUT_SIZE = 128

# 完整版为 8×5 排列，文件 ID 与总览图中的 1～40 编号严格一致。
CELLS = (
    ("ds_01", "开心", (5, 115, 164, 285)),
    ("ds_02", "难过", (163, 115, 326, 285)),
    ("ds_03", "疑惑", (326, 115, 488, 285)),
    ("ds_04", "吃瓜", (485, 115, 642, 285)),
    ("ds_05", "生气", (640, 115, 798, 285)),
    ("ds_06", "无语", (796, 115, 954, 285)),
    ("ds_07", "狗头", (950, 115, 1097, 285)),
    ("ds_08", "宕机", (1088, 115, 1250, 285)),
    ("ds_09", "中性", (5, 350, 164, 522)),
    ("ds_10", "大笑", (163, 350, 326, 522)),
    ("ds_11", "哭泣", (326, 350, 488, 522)),
    ("ds_12", "流汗", (485, 350, 642, 522)),
    ("ds_13", "思考", (640, 350, 798, 522)),
    ("ds_14", "OK", (796, 350, 954, 522)),
    ("ds_15", "点头", (950, 350, 1097, 522)),
    ("ds_16", "睡觉", (1088, 350, 1250, 522)),
    ("ds_17", "委屈", (5, 590, 164, 760)),
    ("ds_18", "偷看", (163, 590, 326, 760)),
    ("ds_19", "赞同", (326, 590, 488, 760)),
    ("ds_20", "比心", (485, 590, 642, 760)),
    ("ds_21", "害羞", (640, 590, 798, 760)),
    ("ds_22", "星星眼", (796, 590, 954, 760)),
    ("ds_23", "笑哭", (950, 590, 1097, 760)),
    ("ds_24", "感动", (1088, 590, 1250, 760)),
    ("ds_25", "惊恐", (5, 815, 164, 970)),
    ("ds_26", "捂脸", (163, 815, 326, 970)),
    ("ds_27", "白眼", (326, 815, 488, 970)),
    ("ds_28", "叹气", (485, 815, 642, 970)),
    ("ds_29", "抓狂", (640, 815, 798, 970)),
    ("ds_30", "调皮", (796, 815, 954, 970)),
    ("ds_31", "偷笑", (950, 815, 1097, 970)),
    ("ds_32", "呵呵", (1088, 815, 1250, 970)),
    ("ds_33", "酷", (5, 1005, 164, 1165)),
    ("ds_34", "庆祝", (163, 1005, 326, 1165)),
    ("ds_35", "加油", (326, 1005, 488, 1165)),
    ("ds_36", "感谢", (485, 1005, 642, 1165)),
    ("ds_37", "抱歉", (640, 1005, 798, 1165)),
    ("ds_38", "抱抱", (796, 1005, 954, 1165)),
    ("ds_39", "拜托", (950, 1005, 1097, 1165)),
    ("ds_40", "鼓掌", (1088, 1005, 1250, 1165)),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="1254×1254 的 8×5 完整鲸鱼表情总览 PNG")
    parser.add_argument("output", type=Path, help="透明 PNG 输出目录")
    parser.add_argument("--preview", type=Path, help="可选的切片总览图路径")
    return parser.parse_args()


def foreground_seed(image: Image.Image) -> Image.Image:
    """用饱和度和暗度找主体种子，避开灰白背景与投影。"""
    rgb = image.convert("RGB")
    mask = Image.new("L", rgb.size)
    pixels = []
    pixel_data = rgb.get_flattened_data() if hasattr(rgb, "get_flattened_data") else rgb.getdata()
    for red, green, blue in pixel_data:
        darkest = min(red, green, blue)
        chroma = max(red, green, blue) - darkest
        is_foreground = (chroma >= 12 and darkest <= 252) or darkest <= 165
        pixels.append(255 if is_foreground else 0)
    mask.putdata(pixels)
    # 闭运算连接被抗锯齿打断的轮廓，同时保持汗滴、标点等小部件。
    return mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))


def remove_tiny_components(mask: Image.Image, minimum_area: int = 12) -> Image.Image:
    """清理背景中的零星彩色噪点，但保留问号、汗滴和省略号。"""
    width, height = mask.size
    source = bytearray(mask.tobytes())
    output = bytearray(width * height)
    visited = bytearray(width * height)

    for start, value in enumerate(source):
        if value == 0 or visited[start]:
            continue
        visited[start] = 1
        queue = deque((start,))
        component = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            y = index // width
            for neighbor in (
                index - width if y > 0 else -1,
                index + width if y + 1 < height else -1,
                index - 1 if x > 0 else -1,
                index + 1 if x + 1 < width else -1,
            ):
                if neighbor >= 0 and source[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        if len(component) >= minimum_area:
            for index in component:
                output[index] = 255

    cleaned = Image.new("L", mask.size)
    cleaned.frombytes(bytes(output))
    return cleaned


def fill_enclosed_background(mask: Image.Image) -> Image.Image:
    """填充主体轮廓内的白色肚皮和眼白，不把外部白底误当成主体。"""
    width, height = mask.size
    source = bytearray(mask.tobytes())
    outside = bytearray(width * height)
    queue: deque[int] = deque()

    def enqueue(index: int) -> None:
        if source[index] == 0 and outside[index] == 0:
            outside[index] = 1
            queue.append(index)

    for x in range(width):
        enqueue(x)
        enqueue((height - 1) * width + x)
    for y in range(height):
        enqueue(y * width)
        enqueue(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        if y > 0:
            enqueue(index - width)
        if y + 1 < height:
            enqueue(index + width)
        if x > 0:
            enqueue(index - 1)
        if x + 1 < width:
            enqueue(index + 1)

    filled = Image.new("L", mask.size)
    filled.putdata([255 if source[index] or not outside[index] else 0 for index in range(width * height)])
    return filled


def extract_emoji(cell: Image.Image) -> Image.Image:
    mask = fill_enclosed_background(remove_tiny_components(foreground_seed(cell)))
    # 轻微柔化只用于恢复原图边缘的抗锯齿，不改变主体轮廓。
    alpha = mask.filter(ImageFilter.GaussianBlur(0.55))
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("没有在单元格中检测到表情主体")

    padding = 4
    left = max(0, bounds[0] - padding)
    top = max(0, bounds[1] - padding)
    right = min(cell.width, bounds[2] + padding)
    bottom = min(cell.height, bounds[3] + padding)
    subject = cell.convert("RGBA").crop((left, top, right, bottom))
    subject.putalpha(alpha.crop((left, top, right, bottom)))

    inner_size = round(OUTPUT_SIZE * 0.90625)
    scale = min(inner_size / subject.width, inner_size / subject.height)
    resized_size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(resized_size, Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    output.alpha_composite(subject, (
        (OUTPUT_SIZE - subject.width) // 2,
        (OUTPUT_SIZE - subject.height) // 2,
    ))
    return output


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def build_preview(emojis: list[tuple[str, str, Image.Image]], target: Path) -> None:
    cell_width, cell_height = 180, 190
    columns = 8 if len(emojis) == 40 else 4
    rows = (len(emojis) + columns - 1) // columns
    preview = Image.new("RGB", (cell_width * columns, cell_height * rows), "white")
    draw = ImageDraw.Draw(preview)
    light, dark = (242, 244, 248), (224, 228, 236)
    font = load_font(18)

    for index, (emoji_id, name, emoji) in enumerate(emojis):
        column, row = index % columns, index // columns
        origin_x, origin_y = column * cell_width, row * cell_height
        # 棋盘格能直观看出输出确实带透明通道。
        block = 12
        for y in range(origin_y, origin_y + 150, block):
            for x in range(origin_x, origin_x + cell_width, block):
                color = light if ((x - origin_x) // block + (y - origin_y) // block) % 2 == 0 else dark
                draw.rectangle((x, y, min(x + block, origin_x + cell_width), min(y + block, origin_y + 150)), fill=color)
        icon = emoji.resize((140, 140), Image.Resampling.LANCZOS)
        preview.paste(icon, (origin_x + 20, origin_y + 5), icon)
        caption = f"{emoji_id.removeprefix('ds_')}. {name}"
        box = draw.textbbox((0, 0), caption, font=font)
        draw.text((origin_x + (cell_width - (box[2] - box[0])) / 2, origin_y + 158), caption, fill=(35, 45, 75), font=font)

    target.parent.mkdir(parents=True, exist_ok=True)
    preview.save(target, optimize=True)


def main() -> None:
    args = parse_args()
    digest = hashlib.sha256()
    with args.source.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)
    actual_sha256 = digest.hexdigest()
    if actual_sha256 != SOURCE_SHA256:
        raise ValueError(f"源图 SHA-256 不匹配：支持 {SOURCE_SHA256}，实际 {actual_sha256}")

    source = Image.open(args.source).convert("RGB")
    if source.size != SOURCE_SIZE:
        raise ValueError(f"源图尺寸必须为 {SOURCE_SIZE[0]}×{SOURCE_SIZE[1]}，实际为 {source.width}×{source.height}")

    args.output.mkdir(parents=True, exist_ok=True)
    emojis: list[tuple[str, str, Image.Image]] = []
    for emoji_id, name, bounds in CELLS:
        emoji = extract_emoji(source.crop(bounds))
        emoji.save(args.output / f"{emoji_id}.png", optimize=True)
        emojis.append((emoji_id, name, emoji))

    if args.preview is not None:
        build_preview(emojis, args.preview)
    print(f"已切出 {len(emojis)} 张透明表情：{args.output}")


if __name__ == "__main__":
    main()
