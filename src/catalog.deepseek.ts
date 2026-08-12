/** 从用户提供的蓝鲸表情包完整版总览图切分出的内置目录。 */

export interface EmojiCatalogEntry {
  readonly id: string
  readonly platform: 'deepseek'
  readonly name: string
  readonly file: string
  readonly tags: readonly string[]
  readonly keywords: readonly string[]
}

/** 当前 8×5 完整版总览 PNG 的 SHA-256，用于追溯切片输入。 */
export const CATALOG_SOURCE_REVISION = 'sha256:3b87fa433ca1ab058a4dcbc020f7e6d8e6c174a1c3587d649a2020544b67e3be'

/** ID 与总览图中的 1～40 编号严格一致。 */
export const EMOJIS = [
  {
    id: 'deepseek:ds_01', platform: 'deepseek', name: '开心', file: 'ds_01.png',
    tags: ['positive', 'happy', 'smiling', 'friendly'],
    keywords: ['开心', '高兴', '微笑', '你好', '欢迎', '愉快'],
  },
  {
    id: 'deepseek:ds_02', platform: 'deepseek', name: '难过', file: 'ds_02.png',
    tags: ['negative', 'sad', 'tearful'],
    keywords: ['难过', '伤心', '失落', '泪目', '不开心'],
  },
  {
    id: 'deepseek:ds_03', platform: 'deepseek', name: '疑惑', file: 'ds_03.png',
    tags: ['neutral', 'confused', 'questioning'],
    keywords: ['疑惑', '问号', '不明白', '为什么', '什么意思'],
  },
  {
    id: 'deepseek:ds_04', platform: 'deepseek', name: '吃瓜', file: 'ds_04.png',
    tags: ['neutral', 'humorous', 'observing'],
    keywords: ['吃瓜', '围观', '看戏', '前排', '发生什么了'],
  },
  {
    id: 'deepseek:ds_05', platform: 'deepseek', name: '生气', file: 'ds_05.png',
    tags: ['negative', 'angry', 'annoyed'],
    keywords: ['生气', '愤怒', '不满', '恼火', '气死了'],
  },
  {
    id: 'deepseek:ds_06', platform: 'deepseek', name: '无语', file: 'ds_06.png',
    tags: ['neutral', 'speechless', 'awkward'],
    keywords: ['无语', '沉默', '一言难尽', '不知道说什么'],
  },
  {
    id: 'deepseek:ds_07', platform: 'deepseek', name: '狗头', file: 'ds_07.png',
    tags: ['neutral', 'humorous', 'sarcastic', 'playful'],
    keywords: ['狗头', 'doge', '开玩笑', '调侃', '你懂的'],
  },
  {
    id: 'deepseek:ds_08', platform: 'deepseek', name: '宕机', file: 'ds_08.png',
    tags: ['negative', 'humorous', 'crashed', 'confused'],
    keywords: ['宕机', '崩溃', '当机', '烧脑', '懵了', '脑子转不过来'],
  },
  {
    id: 'deepseek:ds_09', platform: 'deepseek', name: '中性', file: 'ds_09.png',
    tags: ['neutral', 'plain', 'calm'],
    keywords: ['中性', '平静', '默认', '普通', '没有明显情绪'],
  },
  {
    id: 'deepseek:ds_10', platform: 'deepseek', name: '大笑', file: 'ds_10.png',
    tags: ['positive', 'humorous', 'laughing'],
    keywords: ['大笑', '哈哈', '笑死', '太好笑了', '绷不住了'],
  },
  {
    id: 'deepseek:ds_11', platform: 'deepseek', name: '哭泣', file: 'ds_11.png',
    tags: ['negative', 'crying', 'overwhelmed'],
    keywords: ['哭泣', '大哭', '呜呜', '破防了', '忍不住哭'],
  },
  {
    id: 'deepseek:ds_12', platform: 'deepseek', name: '流汗', file: 'ds_12.png',
    tags: ['anxious', 'awkward', 'sweating'],
    keywords: ['流汗', '紧张', '尴尬', '压力', '汗流浃背'],
  },
  {
    id: 'deepseek:ds_13', platform: 'deepseek', name: '思考', file: 'ds_13.png',
    tags: ['neutral', 'thinking', 'analyzing'],
    keywords: ['思考', '分析', '考虑', '想想', '让我想一下'],
  },
  {
    id: 'deepseek:ds_14', platform: 'deepseek', name: 'OK', file: 'ds_14.png',
    tags: ['positive', 'approving', 'agreeing'],
    keywords: ['OK', '好的', '收到', '没问题', '可以', '搞定'],
  },
  {
    id: 'deepseek:ds_15', platform: 'deepseek', name: '点头', file: 'ds_15.png',
    tags: ['positive', 'agreeing', 'confirming'],
    keywords: ['点头', '同意', '确认', '明白', '认可'],
  },
  {
    id: 'deepseek:ds_16', platform: 'deepseek', name: '睡觉', file: 'ds_16.png',
    tags: ['neutral', 'sleeping', 'tired'],
    keywords: ['睡觉', '晚安', '困了', '休息', '睡着了'],
  },
  {
    id: 'deepseek:ds_17', platform: 'deepseek', name: '委屈', file: 'ds_17.png',
    tags: ['negative', 'aggrieved', 'upset'],
    keywords: ['委屈', '难受', '可怜', '受伤', '不好意思'],
  },
  {
    id: 'deepseek:ds_18', platform: 'deepseek', name: '偷看', file: 'ds_18.png',
    tags: ['neutral', 'playful', 'peeking'],
    keywords: ['偷看', '窥屏', '悄悄看', '暗中观察', '路过看看'],
  },
  {
    id: 'deepseek:ds_19', platform: 'deepseek', name: '赞同', file: 'ds_19.png',
    tags: ['positive', 'supportive', 'approving'],
    keywords: ['赞同', '支持', '点赞', '做得好', '干得漂亮', '测试通过'],
  },
  {
    id: 'deepseek:ds_20', platform: 'deepseek', name: '比心', file: 'ds_20.png',
    tags: ['positive', 'supportive', 'loving', 'heart'],
    keywords: ['比心', '爱心', '喜欢', '支持', '爱你', '给你一颗心'],
  },
  {
    id: 'deepseek:ds_21', platform: 'deepseek', name: '害羞', file: 'ds_21.png',
    tags: ['positive', 'playful', 'blushing', 'shy', 'modest'],
    keywords: ['害羞', '脸红', '不好意思', '过奖了', '腼腆'],
  },
  {
    id: 'deepseek:ds_22', platform: 'deepseek', name: '星星眼', file: 'ds_22.png',
    tags: ['positive', 'supportive', 'star-eyes', 'admiring', 'impressed'],
    keywords: ['星星眼', '崇拜', '佩服', '太强了', '大佬', '期待'],
  },
  {
    id: 'deepseek:ds_23', platform: 'deepseek', name: '笑哭', file: 'ds_23.png',
    tags: ['positive', 'humorous', 'laughing', 'crying', 'amused'],
    keywords: ['笑哭', '笑死', '笑出眼泪', '哈哈哈哈', '绷不住了'],
  },
  {
    id: 'deepseek:ds_24', platform: 'deepseek', name: '感动', file: 'ds_24.png',
    tags: ['positive', 'moved', 'tearful', 'grateful'],
    keywords: ['感动', '泪目', '暖心', '太好了', '谢谢你'],
  },
  {
    id: 'deepseek:ds_25', platform: 'deepseek', name: '惊恐', file: 'ds_25.png',
    tags: ['negative', 'scared', 'shocked', 'anxious'],
    keywords: ['惊恐', '害怕', '吓到了', '瑟瑟发抖', '什么鬼'],
  },
  {
    id: 'deepseek:ds_26', platform: 'deepseek', name: '捂脸', file: 'ds_26.png',
    tags: ['neutral', 'humorous', 'facepalm', 'embarrassed', 'cringing'],
    keywords: ['捂脸', '尴尬', '没眼看', '不好意思', '太丢脸了'],
  },
  {
    id: 'deepseek:ds_27', platform: 'deepseek', name: '白眼', file: 'ds_27.png',
    tags: ['negative', 'sarcastic', 'eye-roll', 'dismissive', 'disdain'],
    keywords: ['白眼', '嫌弃', '鄙视', '不想理你', '服了'],
  },
  {
    id: 'deepseek:ds_28', platform: 'deepseek', name: '叹气', file: 'ds_28.png',
    tags: ['negative', 'sighing', 'helpless', 'resigned', 'tired'],
    keywords: ['叹气', '无奈', '心累', '算了', '唉', '没办法'],
  },
  {
    id: 'deepseek:ds_29', platform: 'deepseek', name: '抓狂', file: 'ds_29.png',
    tags: ['negative', 'frustrated', 'overwhelmed', 'angry'],
    keywords: ['抓狂', '崩溃', '疯了', '受不了了', '头大'],
  },
  {
    id: 'deepseek:ds_30', platform: 'deepseek', name: '调皮', file: 'ds_30.png',
    tags: ['positive', 'playful', 'tongue-out', 'joking', 'cute'],
    keywords: ['调皮', '吐舌', '卖萌', '俏皮', '略略略'],
  },
  {
    id: 'deepseek:ds_31', platform: 'deepseek', name: '偷笑', file: 'ds_31.png',
    tags: ['positive', 'humorous', 'mouth-covered', 'amused', 'playful'],
    keywords: ['偷笑', '窃笑', '嘿嘿', '忍不住笑', '暗自高兴'],
  },
  {
    id: 'deepseek:ds_32', platform: 'deepseek', name: '呵呵', file: 'ds_32.png',
    tags: ['negative', 'sarcastic', 'dismissive', 'passive-aggressive'],
    keywords: ['呵呵', '冷笑', '礼貌微笑', '看傻子', '不想理你'],
  },
  {
    id: 'deepseek:ds_33', platform: 'deepseek', name: '酷', file: 'ds_33.png',
    tags: ['positive', 'confident', 'sunglasses', 'smug'],
    keywords: ['酷', '墨镜', '帅', '自信', '大佬', 'cool'],
  },
  {
    id: 'deepseek:ds_34', platform: 'deepseek', name: '庆祝', file: 'ds_34.png',
    tags: ['positive', 'celebrating', 'excited', 'joyful'],
    keywords: ['庆祝', '撒花', '成功', '完成', '恭喜', '耶'],
  },
  {
    id: 'deepseek:ds_35', platform: 'deepseek', name: '加油', file: 'ds_35.png',
    tags: ['positive', 'supportive', 'encouraging', 'cheering'],
    keywords: ['加油', '打气', '鼓励', '坚持住', '冲呀', '你可以的'],
  },
  {
    id: 'deepseek:ds_36', platform: 'deepseek', name: '感谢', file: 'ds_36.png',
    tags: ['positive', 'grateful', 'appreciative', 'friendly'],
    keywords: ['感谢', '谢谢', '多谢', '辛苦了', '感激'],
  },
  {
    id: 'deepseek:ds_37', platform: 'deepseek', name: '抱歉', file: 'ds_37.png',
    tags: ['negative', 'apologetic', 'remorseful', 'embarrassed'],
    keywords: ['抱歉', '对不起', '不好意思', '我的错', '认错'],
  },
  {
    id: 'deepseek:ds_38', platform: 'deepseek', name: '抱抱', file: 'ds_38.png',
    tags: ['positive', 'supportive', 'comforting', 'hugging'],
    keywords: ['抱抱', '拥抱', '安慰', '别难过', '摸摸头'],
  },
  {
    id: 'deepseek:ds_39', platform: 'deepseek', name: '拜托', file: 'ds_39.png',
    tags: ['neutral', 'pleading', 'requesting', 'hopeful'],
    keywords: ['拜托', '求求了', '请帮忙', '行行好', '麻烦了'],
  },
  {
    id: 'deepseek:ds_40', platform: 'deepseek', name: '鼓掌', file: 'ds_40.png',
    tags: ['positive', 'applauding', 'congratulating', 'supportive'],
    keywords: ['鼓掌', '掌声', '拍手', '祝贺', '太棒了', '做得好'],
  },
] as const satisfies readonly EmojiCatalogEntry[]
