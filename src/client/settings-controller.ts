/** dsh-emoji 设置卡片的浏览器状态控制器。 */

import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import {
  DEFAULT_EMOJI_SETTINGS,
  EMOJI_SETTINGS_RPC_CHANNEL,
  parseEmojiSettings,
  parseRevision,
  type EmojiMode,
  type EmojiSettings,
  type EmojiSettingsDocument,
} from '../settings-model.ts'

export type EmojiSettingsStatus = 'loading' | 'ready' | 'unavailable'

export interface EmojiSettingsSnapshot {
  status: EmojiSettingsStatus
  persisted: EmojiSettings
  draft: EmojiSettings
  revision: number
  writable: boolean
  dirty: boolean
  saving: boolean
  saved: boolean
  error?: string
}

function sameSettings(left: EmojiSettings, right: EmojiSettings): boolean {
  return left.mode === right.mode
    && left.customPrompt === right.customPrompt
}

function cloneSettings(value: EmojiSettings): EmojiSettings {
  return {
    mode: value.mode,
    customPrompt: value.customPrompt,
  }
}

function parseDocument(value: unknown): EmojiSettingsDocument | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  const settings = parseEmojiSettings(candidate.settings)
  const revision = parseRevision(candidate.revision)
  if (settings === undefined || revision === undefined || typeof candidate.writable !== 'boolean') return undefined
  return { settings, revision, writable: candidate.writable }
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * 设置卡片的 observable source。组件只读 snapshot 并触发 action；网络竞态、
 * revision 和跨标签页失效都在这里收口，避免 React 组件持有业务状态。
 */
export class EmojiSettingsController {
  private readonly listeners = new Set<() => void>()
  private requestGeneration = 0
  private invalidated = false
  private snapshot: EmojiSettingsSnapshot

  constructor(
    private readonly rpc: ClientConnectionRpc,
    isLoopback: boolean,
  ) {
    const defaults = cloneSettings(DEFAULT_EMOJI_SETTINGS)
    this.snapshot = {
      status: isLoopback ? 'loading' : 'unavailable',
      persisted: defaults,
      draft: cloneSettings(defaults),
      revision: 0,
      writable: false,
      dirty: false,
      saving: false,
      saved: false,
      ...isLoopback ? {} : { error: '表情设置仅可从 Host 本机的 loopback 页面修改。' },
    }
  }

  readonly getSnapshot = (): EmojiSettingsSnapshot => this.snapshot

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(next: Omit<EmojiSettingsSnapshot, 'dirty'> & { dirty?: boolean }): void {
    const { dirty: _ignoredDirty, ...rest } = next
    this.snapshot = {
      ...rest,
      dirty: !sameSettings(next.persisted, next.draft),
    }
    for (const listener of [...this.listeners]) listener()
  }

  private accept(document: EmojiSettingsDocument, saved = false): void {
    const value = cloneSettings(document.settings)
    this.invalidated = false
    this.publish({
      status: 'ready',
      persisted: value,
      draft: cloneSettings(value),
      revision: document.revision,
      writable: document.writable,
      saving: false,
      saved,
    })
  }

  private async call(endpoint: string, payload: unknown): Promise<EmojiSettingsDocument> {
    const result = await this.rpc.call(EMOJI_SETTINGS_RPC_CHANNEL, endpoint, payload)
    if (!result.ok) throw new Error(result.error.message)
    const document = parseDocument(result.value)
    if (document === undefined) throw new Error('Host 返回了无法识别的表情设置。')
    return document
  }

  /** 首次加载、连接恢复或跨标签页写入后重新读取 Host。 */
  async refresh(): Promise<void> {
    if (this.snapshot.status === 'unavailable' && this.snapshot.error?.includes('loopback')) return
    if (this.snapshot.saving || this.snapshot.dirty) {
      this.invalidated = true
      return
    }
    const generation = ++this.requestGeneration
    try {
      const document = await this.call('get', {})
      if (generation !== this.requestGeneration) return
      this.accept(document)
    } catch (error) {
      if (generation !== this.requestGeneration) return
      this.publish({
        ...this.snapshot,
        status: 'unavailable',
        saving: false,
        saved: false,
        error: errorMessage(error),
      })
    }
  }

  /** 收到 Host 文档变更事件；有未保存编辑时先保留草稿。 */
  readonly invalidate = (): void => {
    if (this.snapshot.saving || this.snapshot.dirty) {
      this.invalidated = true
      return
    }
    void this.refresh()
  }

  readonly editMode = (mode: EmojiMode): void => {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving) return
    this.publish({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, mode },
      saved: false,
      error: undefined,
    })
  }

  readonly editCustomPrompt = (customPrompt: string): void => {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving) return
    this.publish({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, customPrompt },
      saved: false,
      error: undefined,
    })
  }

  readonly discard = (): void => {
    if (this.snapshot.status !== 'ready' || this.snapshot.saving) return
    const shouldRefresh = this.invalidated
    this.publish({
      ...this.snapshot,
      draft: cloneSettings(this.snapshot.persisted),
      saved: false,
      error: undefined,
    })
    if (shouldRefresh) void this.refresh()
  }

  readonly save = (): void => { void this.commit('save') }

  readonly reset = (): void => { void this.commit('reset') }

  private async commit(endpoint: 'save' | 'reset'): Promise<void> {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving) return
    if (endpoint === 'save' && !this.snapshot.dirty) return
    const generation = ++this.requestGeneration
    const draft = cloneSettings(this.snapshot.draft)
    const revision = this.snapshot.revision
    this.publish({ ...this.snapshot, saving: true, saved: false, error: undefined })
    try {
      const document = await this.call(endpoint, endpoint === 'save'
        ? { settings: draft, expectedRevision: revision }
        : { expectedRevision: revision })
      if (generation !== this.requestGeneration) return
      this.accept(document, true)
    } catch (error) {
      if (generation !== this.requestGeneration) return
      this.invalidated = true
      this.publish({
        ...this.snapshot,
        saving: false,
        saved: false,
        error: errorMessage(error),
      })
    }
  }
}
