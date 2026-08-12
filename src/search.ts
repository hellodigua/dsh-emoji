import { EMOJI_ALIASES } from './aliases.ts'
import { EMOJIS, type EmojiCatalogEntry } from './catalog.ts'

/** 可解释且稳定的本地检索结果。 */
export interface EmojiSearchResult {
  readonly emoji: EmojiCatalogEntry
  readonly score: number
  readonly matched: readonly string[]
}

/** 统一大小写、全半角、空白和标点，保留中文与字母数字。 */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('zh-CN').replaceAll(/[^\p{Letter}\p{Number}]+/gu, '')
}

interface WeightedTerm {
  readonly value: string
  readonly exactRank: number
  readonly exactScore: number
  readonly containsRank: number
  readonly containsScore: number
  readonly kind: 'name' | 'keyword' | 'alias' | 'tag'
}

function weightedTerms(emoji: EmojiCatalogEntry): WeightedTerm[] {
  return [
    { value: emoji.name, exactRank: 4, exactScore: 1000, containsRank: 1, containsScore: 600, kind: 'name' },
    ...emoji.keywords.map(value => ({ value, exactRank: 3, exactScore: 900, containsRank: 1, containsScore: 560, kind: 'keyword' as const })),
    ...(EMOJI_ALIASES[emoji.id] ?? []).map(value => ({ value, exactRank: 2, exactScore: 850, containsRank: 1, containsScore: 540, kind: 'alias' as const })),
    ...emoji.tags.map(value => ({ value, exactRank: 1, exactScore: 300, containsRank: 1, containsScore: 180, kind: 'tag' as const })),
  ]
}

/**
 * 在内置目录中按名称、关键词、场景别名和标签检索。
 * 无有效字符或无正分匹配时返回 undefined，避免用不相关表情猜测语气。
 */
export function searchEmoji(query: string): EmojiSearchResult | undefined {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length === 0) return undefined

  const ranked = EMOJIS.map((emoji, index) => {
    let score = 0
    let rank = 0
    const matched: string[] = []
    const seenTerms = new Set<string>()
    for (const term of weightedTerms(emoji)) {
      const normalizedTerm = normalizeSearchText(term.value)
      if (normalizedTerm.length === 0 || seenTerms.has(normalizedTerm)) continue
      seenTerms.add(normalizedTerm)
      if (normalizedQuery === normalizedTerm) {
        rank = Math.max(rank, term.exactRank)
        score += term.exactScore
        matched.push(`${term.kind}:exact:${term.value}`)
      } else if (Math.min(normalizedQuery.length, normalizedTerm.length) >= 2
        && (normalizedQuery.includes(normalizedTerm) || normalizedTerm.includes(normalizedQuery))) {
        rank = Math.max(rank, term.containsRank)
        score += term.containsScore + Math.min(normalizedTerm.length, 20)
        matched.push(`${term.kind}:contains:${term.value}`)
      }
    }
    return { emoji, rank, score, matched, index }
  }).filter(result => result.score > 0)

  ranked.sort((left, right) => right.rank - left.rank || right.score - left.score || left.index - right.index || left.emoji.id.localeCompare(right.emoji.id))
  const first = ranked[0]
  return first === undefined ? undefined : { emoji: first.emoji, score: first.score, matched: first.matched }
}
