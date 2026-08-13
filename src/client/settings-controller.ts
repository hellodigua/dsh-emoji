/** dsh-emoji 设置卡片的浏览器状态控制器。 */

import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import {
  DEFAULT_EMOJI_SETTINGS,
  EMOJI_SETTINGS_RPC_CHANNEL,
  parseEmojiSettings,
  parseRevision,
  type EmojiMode,
  type EmojiDisplaySize,
  type EmojiSettings,
  type EmojiSettingsDocument,
} from '../settings-model.ts'
import { MAX_PACK_ARCHIVE_BYTES, type EmojiPackSummary } from '../pack-model.ts'

export type EmojiSettingsStatus = 'loading' | 'ready' | 'unavailable'
export type EmojiSettingsErrorCode =
  | 'loopbackRequired'
  | 'invalidResponse'
  | 'conflict'
  | 'invalidRequest'
  | 'rejected'
  | 'loadFailed'
  | 'saveFailed'
  | 'packInvalid'
  | 'packTooLarge'
  | 'packConflict'
  | 'packNotFound'
  | 'packActive'
  | 'packWriteFailed'
  | 'uploadFailed'
  | 'removeFailed'

export type EmojiPackNotice = 'uploaded' | 'removed'

export interface EmojiSettingsSnapshot {
  status: EmojiSettingsStatus
  persisted: EmojiSettings
  draft: EmojiSettings
  revision: number
  writable: boolean
  packs: readonly EmojiPackSummary[]
  dirty: boolean
  saving: boolean
  packBusy: boolean
  saved: boolean
  packNotice?: EmojiPackNotice
  error?: EmojiSettingsErrorCode
}

function sameSettings(left: EmojiSettings, right: EmojiSettings): boolean {
  return left.mode === right.mode
    && left.displaySize === right.displaySize
    && left.customPrompt === right.customPrompt
    && left.activePack === right.activePack
}

function cloneSettings(value: EmojiSettings): EmojiSettings {
  return {
    mode: value.mode,
    displaySize: value.displaySize,
    customPrompt: value.customPrompt,
    activePack: value.activePack,
    packRevision: value.packRevision,
  }
}

function parsePackSummary(value: unknown): EmojiPackSummary | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  if (typeof candidate.ref !== 'string' || typeof candidate.id !== 'string'
    || typeof candidate.name !== 'string' || typeof candidate.version !== 'string'
    || typeof candidate.builtIn !== 'boolean' || !Number.isSafeInteger(candidate.emojiCount)
    || !Array.isArray(candidate.previews)) return undefined
  const previews = candidate.previews.map((preview) => {
    if (typeof preview !== 'object' || preview === null || Array.isArray(preview)) return undefined
    const item = preview as Record<string, unknown>
    if (typeof item.key !== 'string' || typeof item.label !== 'string' || typeof item.url !== 'string'
      || !item.url.startsWith('/api/dsh-emoji/assets/')) return undefined
    return { key: item.key, label: item.label, url: item.url }
  })
  if (previews.some(preview => preview === undefined)) return undefined
  return {
    ref: candidate.ref,
    id: candidate.id,
    name: candidate.name,
    version: candidate.version,
    builtIn: candidate.builtIn,
    emojiCount: Number(candidate.emojiCount),
    previews: previews as EmojiPackSummary['previews'],
  }
}

function parseDocument(value: unknown): EmojiSettingsDocument | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  const settings = parseEmojiSettings(candidate.settings)
  const revision = parseRevision(candidate.revision)
  if (settings === undefined || revision === undefined || typeof candidate.writable !== 'boolean'
    || !Array.isArray(candidate.packs)) return undefined
  const packs = candidate.packs.map(parsePackSummary)
  if (packs.some(pack => pack === undefined)
    || !packs.some(pack => pack?.ref === settings.activePack)) return undefined
  return { settings, revision, writable: candidate.writable, packs: packs as EmojiPackSummary[] }
}

class EmojiSettingsRequestError extends Error {
  constructor(readonly code: EmojiSettingsErrorCode) {
    super(code)
  }
}

function requestErrorCode(
  error: unknown,
  fallback: 'loadFailed' | 'saveFailed' | 'uploadFailed' | 'removeFailed',
): EmojiSettingsErrorCode {
  return error instanceof EmojiSettingsRequestError ? error.code : fallback
}

function remoteErrorCode(code: string, details: unknown): EmojiSettingsErrorCode {
  if (code === 'settings-conflict') return 'conflict'
  if (code === 'bad-request') return 'invalidRequest'
  if (code === 'settings-rejected') return 'rejected'
  if (code === 'attachment-error' && typeof details === 'object' && details !== null) {
    const reason = (details as { reason?: unknown }).reason
    if (reason === 'pack-invalid') return 'packInvalid'
    if (reason === 'pack-too-large') return 'packTooLarge'
    if (reason === 'pack-conflict') return 'packConflict'
    if (reason === 'pack-not-found') return 'packNotFound'
    if (reason === 'pack-active') return 'packActive'
    if (reason === 'pack-write-failed') return 'packWriteFailed'
  }
  return 'rejected'
}

async function fileBase64(file: File): Promise<string> {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => { reject(reader.error ?? new Error('Could not read the emoji pack ZIP.')) }
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('Could not read the emoji pack ZIP.'))
    }
    reader.readAsArrayBuffer(file)
  })
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  const size = 0x8000
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + size)))
  }
  return btoa(chunks.join(''))
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
      packs: [],
      dirty: false,
      saving: false,
      packBusy: false,
      saved: false,
      ...isLoopback ? {} : { error: 'loopbackRequired' },
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
      packs: document.packs,
      saving: false,
      packBusy: false,
      saved,
    })
  }

  private async call(endpoint: string, payload: unknown): Promise<EmojiSettingsDocument> {
    const result = await this.rpc.call(EMOJI_SETTINGS_RPC_CHANNEL, endpoint, payload)
    if (!result.ok) throw new EmojiSettingsRequestError(remoteErrorCode(result.error.code, result.error.details))
    const document = parseDocument(result.value)
    if (document === undefined) throw new EmojiSettingsRequestError('invalidResponse')
    return document
  }

  /** 首次加载、连接恢复或跨标签页写入后重新读取 Host。 */
  async refresh(): Promise<void> {
    if (this.snapshot.status === 'unavailable' && this.snapshot.error?.includes('loopback')) return
    if (this.snapshot.saving || this.snapshot.packBusy || this.snapshot.dirty) {
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
        error: requestErrorCode(error, 'loadFailed'),
      })
    }
  }

  /** 收到 Host 文档变更事件；有未保存编辑时先保留草稿。 */
  readonly invalidate = (): void => {
    if (this.snapshot.saving || this.snapshot.packBusy || this.snapshot.dirty) {
      this.invalidated = true
      return
    }
    void this.refresh()
  }

  readonly editMode = (mode: EmojiMode): void => {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return
    this.requestGeneration += 1
    this.publish({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, mode },
      saved: false,
      error: this.snapshot.error === 'conflict' ? 'conflict' : undefined,
    })
  }

  readonly editDisplaySize = (displaySize: EmojiDisplaySize): void => {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return
    this.requestGeneration += 1
    this.publish({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, displaySize },
      saved: false,
      error: this.snapshot.error === 'conflict' ? 'conflict' : undefined,
    })
  }

  readonly editCustomPrompt = (customPrompt: string): void => {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return
    this.requestGeneration += 1
    this.publish({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, customPrompt },
      saved: false,
      error: this.snapshot.error === 'conflict' ? 'conflict' : undefined,
    })
  }

  readonly editActivePack = (activePack: string): void => {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy
      || !this.snapshot.packs.some(pack => pack.ref === activePack)) return
    this.requestGeneration += 1
    this.publish({
      ...this.snapshot,
      draft: { ...this.snapshot.draft, activePack },
      saved: false,
      packNotice: undefined,
      error: this.snapshot.error === 'conflict' ? 'conflict' : undefined,
    })
  }

  readonly discard = (): void => {
    if (this.snapshot.status !== 'ready' || this.snapshot.saving || this.snapshot.packBusy) return
    const shouldRefresh = this.invalidated
    this.publish({
      ...this.snapshot,
      draft: cloneSettings(this.snapshot.persisted),
      saved: false,
      packNotice: undefined,
      error: undefined,
    })
    if (shouldRefresh) void this.refresh()
  }

  readonly save = (): void => { void this.commit('save') }

  readonly reset = (): void => { void this.commit('reset') }

  readonly uploadPack = (file: File): void => { void this.mutatePacks('pack-upload', file) }

  readonly removePack = (packRef: string): void => { void this.mutatePacks('pack-remove', packRef) }

  private async mutatePacks(endpoint: 'pack-upload' | 'pack-remove', input: File | string): Promise<void> {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return
    if (endpoint === 'pack-upload' && input instanceof File && input.size > MAX_PACK_ARCHIVE_BYTES) {
      this.publish({ ...this.snapshot, saved: false, packNotice: undefined, error: 'packTooLarge' })
      return
    }
    const generation = ++this.requestGeneration
    this.publish({ ...this.snapshot, packBusy: true, saved: false, packNotice: undefined, error: undefined })
    try {
      const payload = endpoint === 'pack-upload'
        ? { archiveBase64: await fileBase64(input as File) }
        : { packRef: input as string }
      const document = await this.call(endpoint, payload)
      if (generation !== this.requestGeneration) return
      const hadDraft = this.snapshot.dirty
      const draft = hadDraft && document.packs.some(pack => pack.ref === this.snapshot.draft.activePack)
        ? { ...cloneSettings(this.snapshot.draft), packRevision: document.settings.packRevision }
        : cloneSettings(document.settings)
      // Pack mutations intentionally advance the shared Settings revision. Only a
      // simultaneous user-visible settings change conflicts with a retained draft.
      if (hadDraft && !sameSettings(document.settings, this.snapshot.persisted)) this.invalidated = true
      this.publish({
        status: 'ready',
        persisted: cloneSettings(document.settings),
        draft,
        revision: document.revision,
        writable: document.writable,
        packs: document.packs,
        saving: false,
        packBusy: false,
        saved: false,
        packNotice: endpoint === 'pack-upload' ? 'uploaded' : 'removed',
      })
      if (this.invalidated && !this.snapshot.dirty) {
        this.invalidated = false
        void this.refresh()
      }
    } catch (error) {
      if (generation !== this.requestGeneration) return
      this.publish({
        ...this.snapshot,
        packBusy: false,
        saved: false,
        packNotice: undefined,
        error: requestErrorCode(error, endpoint === 'pack-upload' ? 'uploadFailed' : 'removeFailed'),
      })
    }
  }

  private async commit(endpoint: 'save' | 'reset'): Promise<void> {
    if (this.snapshot.status !== 'ready' || !this.snapshot.writable || this.snapshot.saving || this.snapshot.packBusy) return
    if (this.snapshot.error === 'conflict') return
    if (endpoint === 'save' && !this.snapshot.dirty) return
    const generation = ++this.requestGeneration
    const draft = cloneSettings(this.snapshot.draft)
    const revision = this.snapshot.revision
    this.publish({ ...this.snapshot, saving: true, saved: false, packNotice: undefined, error: undefined })
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
        error: requestErrorCode(error, 'saveFailed'),
      })
    }
  }
}
