/** “设置 → 插件”中的 dsh-emoji 配置卡片。 */

import { useState, type CSSProperties } from 'react'
import type {
  InjectFace, PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import {
  EMOJI_DISPLAY_SIZES, EMOJI_DISPLAY_SIZE_EM, EMOJI_MODES, MAX_CUSTOM_PROMPT_LENGTH,
  type EmojiDisplaySize, type EmojiMode,
} from '../settings-model.ts'
import type { EmojiPackSummary } from '../pack-model.ts'
import type {
  EmojiSettingsController, EmojiSettingsErrorCode, EmojiSettingsSnapshot,
} from './settings-controller.ts'
import { EMOJI_LOCALE_NS, type EmojiLocaleKey } from './locales.ts'

export interface EmojiSettingsCardFace {
  hooks: { emojiSettings: EmojiSettingsController }
  editMode: (mode: EmojiMode) => void
  editDisplaySize: (displaySize: EmojiDisplaySize) => void
  editCustomPrompt: (value: string) => void
  editActivePack: (packRef: string) => void
  uploadPack: (file: File) => void
  removePack: (packRef: string) => void
  save: () => void
  discard: () => void
  reset: () => void
}

export type EmojiSettingsCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<typeof EMOJI_LOCALE_NS>
  & InjectFace<EmojiSettingsCardFace>

/** 内置包的版本仅用于路由与缓存，不作为面向用户的设置元数据展示。 */
export function visiblePackRef(pack: EmojiPackSummary): string | undefined {
  return pack.builtIn ? undefined : `${pack.id}@${pack.version}`
}

interface ModeCopy {
  title: EmojiLocaleKey
  description: EmojiLocaleKey
}

const MODE_COPY: Record<EmojiMode, ModeCopy> = {
  off: { title: 'mode.off.title', description: 'mode.off.description' },
  auto: { title: 'mode.auto.title', description: 'mode.auto.description' },
  frequent: { title: 'mode.frequent.title', description: 'mode.frequent.description' },
}

const SIZE_COPY: Record<EmojiDisplaySize, EmojiLocaleKey> = {
  small: 'size.small',
  normal: 'size.normal',
  large: 'size.large',
  xlarge: 'size.xlarge',
}

const ERROR_COPY: Record<EmojiSettingsErrorCode, EmojiLocaleKey> = {
  loopbackRequired: 'error.loopbackRequired',
  invalidResponse: 'error.invalidResponse',
  conflict: 'error.conflict',
  invalidRequest: 'error.invalidRequest',
  rejected: 'error.rejected',
  loadFailed: 'error.loadFailed',
  saveFailed: 'error.saveFailed',
  packInvalid: 'error.packInvalid',
  packTooLarge: 'error.packTooLarge',
  packConflict: 'error.packConflict',
  packNotFound: 'error.packNotFound',
  packActive: 'error.packActive',
  packWriteFailed: 'error.packWriteFailed',
  uploadFailed: 'error.uploadFailed',
  removeFailed: 'error.removeFailed',
}

const PREVIEW_COPY: Partial<Record<string, EmojiLocaleKey>> = {
  happy: 'pack.preview.happy',
  laughing: 'pack.preview.laughing',
  thinking: 'pack.preview.thinking',
  celebrate: 'pack.preview.celebrate',
}

const styles = {
  card: {
    listStyle: 'none', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12,
    background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)',
  },
  header: {
    width: '100%', appearance: 'none', border: 0, background: 'none', color: 'inherit', textAlign: 'left',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
    font: 'inherit', borderRadius: 12,
  },
  headText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  title: { fontSize: 15, lineHeight: 1.4, fontWeight: 600 },
  description: { fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
  badge: {
    borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px',
    background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)',
  },
  body: { borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '0 16px', padding: '14px 0 8px' },
  fieldset: { margin: 0, padding: 0, border: 0 },
  legend: { padding: 0, marginBottom: 8, fontSize: 13, fontWeight: 600 },
  modeOptions: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  mode: {
    minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '8px 4px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8,
    background: 'var(--dsw-alias-bg-module-platform)', cursor: 'pointer',
  },
  modeSelected: { borderColor: 'var(--dsw-alias-label-primary)' },
  modeDisabled: { cursor: 'default', opacity: 0.6 },
  modeRadio: { flex: '0 0 auto', margin: 0 },
  modeTitle: { minWidth: 0, fontSize: 12, lineHeight: '18px', fontWeight: 500, whiteSpace: 'nowrap' },
  modeDescription: {
    minHeight: 18, margin: '10px 2px 0', fontSize: 12, lineHeight: '18px',
    color: 'var(--dsw-alias-label-tertiary)',
  },
  promptField: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 },
  promptLabel: { fontSize: 13, lineHeight: '20px', fontWeight: 600 },
  promptHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  promptExample: {
    flex: '0 0 auto', border: 0, padding: 0, background: 'none', color: 'var(--dsw-alias-label-secondary)',
    font: 'inherit', fontSize: 12, lineHeight: '20px', cursor: 'pointer', textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  promptTextarea: {
    boxSizing: 'border-box', width: '100%', minHeight: 112, resize: 'vertical', padding: '9px 10px',
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, font: 'inherit', fontSize: 13,
    lineHeight: 1.55, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-module-platform)',
  },
  promptMeta: {
    display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, lineHeight: '17px',
    color: 'var(--dsw-alias-label-tertiary)',
  },
  packField: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 },
  packOptions: {
    display: 'flex', flexWrap: 'nowrap', gap: 7, overflowX: 'auto', padding: '2px 1px 5px',
    scrollbarWidth: 'thin',
  },
  packOption: {
    flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 220,
    padding: '6px 11px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 999,
    background: 'none', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer', font: 'inherit',
  },
  packOptionSelected: {
    borderColor: 'var(--dsw-alias-label-primary)',
    background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-primary)',
  },
  packOptionMark: { flex: '0 0 auto', fontSize: 11, lineHeight: '18px' },
  packOptionName: {
    display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
    fontSize: 12, lineHeight: '18px', fontWeight: 600, whiteSpace: 'nowrap',
  },
  packMeta: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
  previews: {
    boxSizing: 'border-box', display: 'flex', flexWrap: 'nowrap', gap: 8, width: '100%',
    overflowX: 'auto', padding: '5px 2px 7px', scrollbarWidth: 'thin',
  },
  preview: { flex: '0 0 auto', width: 34, height: 34, objectFit: 'contain', borderRadius: 6 },
  packActions: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 },
  upload: { position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center' },
  hiddenFile: { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
  sizeFieldset: { margin: '14px 0 0', padding: 0, border: 0 },
  sizeOptions: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 7 },
  sizePreview: {
    display: 'block', minHeight: 42, margin: '9px 2px 0', fontSize: 14,
    lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden',
  },
  note: { margin: '12px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
  status: { margin: '0 0 12px', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
  error: { margin: '10px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-state-error-primary)' },
  saved: { margin: '10px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
    marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--dsw-alias-border-l2)',
  },
  button: {
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: '5px 12px',
    font: 'inherit', fontSize: 13, lineHeight: 1.5, cursor: 'pointer',
    background: 'none', color: 'var(--dsw-alias-label-secondary)',
  },
  save: {
    border: '1px solid transparent', borderRadius: 8, padding: '5px 14px', font: 'inherit',
    fontSize: 13, lineHeight: 1.5, cursor: 'pointer',
    background: 'var(--dsw-alias-label-primary)', color: 'var(--dsw-alias-bg-layer-3)',
  },
} satisfies Record<string, CSSProperties>

function modeSummary(state: EmojiSettingsSnapshot, t: EmojiSettingsCardProps['t']): string {
  if (state.status === 'loading') return t('summary.loading')
  if (state.status === 'unavailable') return t('summary.unavailable')
  return t(MODE_COPY[state.persisted.mode].title)
}

/** 渲染带暂存、保存、放弃和恢复默认能力的插件卡片。 */
export function EmojiSettingsCard(props: EmojiSettingsCardProps) {
  const [open, setOpen] = useState(false)
  const state = props.useEmojiSettings(snapshot => snapshot)
  const editable = state.status === 'ready' && state.writable && !state.saving && !state.packBusy
  const revisionBlocked = state.error === 'conflict'
  const selectedPack = state.packs.find(pack => pack.ref === state.draft.activePack)
  const displaySizeEm = EMOJI_DISPLAY_SIZE_EM[state.draft.displaySize]
  const displayAlignEm = Number(((1 - displaySizeEm) / 2 - 0.05).toFixed(3))
  const title = props.t('title')
  return (
    <li data-dsh-emoji-settings-card="true" data-open={open ? 'true' : 'false'} style={styles.card}>
      <button
        type="button"
        data-dsh-emoji-settings-header="true"
        style={styles.header}
        aria-expanded={open}
        aria-label={`${props.t(open ? 'collapse' : 'expand')}: ${title}`}
        onClick={() => { setOpen(!open) }}
      >
        <span style={styles.headText}>
          <span style={styles.title}>{title}</span>
          <span style={styles.description}>{props.t('description')}</span>
        </span>
        {state.dirty ? <span style={styles.badge}>{props.t('unsaved')}</span> : null}
        <span style={styles.badge}>{modeSummary(state, props.t)}</span>
        <IconChevronDownOutline14 className="dsh-emoji-settings-chevron" />
      </button>
      {open
        ? (
          <div style={styles.body}>
            {state.status === 'loading' ? <p style={styles.status}>{props.t('status.loading')}</p> : null}
            {state.status === 'unavailable' ? <p style={styles.status}>{props.t('status.unavailable')}</p> : null}
            <fieldset style={styles.fieldset} disabled={!editable}>
              <legend style={styles.legend}>{props.t('policy.legend')}</legend>
              <div style={styles.modeOptions}>
                {EMOJI_MODES.map((mode) => {
                  const selected = state.draft.mode === mode
                  return (
                    <label
                      key={mode}
                      style={{
                        ...styles.mode,
                        ...(selected ? styles.modeSelected : {}),
                        ...(!editable ? styles.modeDisabled : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="dsh-emoji-mode"
                        value={mode}
                        style={styles.modeRadio}
                        checked={selected}
                        onChange={() => { props.editMode(mode) }}
                      />
                      <span style={styles.modeTitle}>{props.t(MODE_COPY[mode].title)}</span>
                    </label>
                  )
                })}
              </div>
              <p style={styles.modeDescription} aria-live="polite">
                {props.t(MODE_COPY[state.draft.mode].description)}
              </p>
            </fieldset>
            <section style={styles.packField} aria-labelledby="dsh-emoji-pack-label">
              <span id="dsh-emoji-pack-label" style={styles.promptLabel}>{props.t('pack.label')}</span>
              <div
                role="radiogroup"
                aria-labelledby="dsh-emoji-pack-label"
                aria-orientation="horizontal"
                style={styles.packOptions}
              >
                {state.packs.map((pack, index) => {
                  const selected = pack.ref === state.draft.activePack
                  const optionId = `dsh-emoji-pack-option-${String(index)}`
                  const visibleRef = visiblePackRef(pack)
                  return (
                    <button
                      key={pack.ref}
                      id={optionId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      disabled={!editable}
                      title={visibleRef === undefined
                        ? `${pack.name} · ${props.t('pack.builtin')}`
                        : `${pack.name} · ${pack.version}`}
                      style={{
                        ...styles.packOption,
                        ...(selected ? styles.packOptionSelected : {}),
                        ...(!editable ? styles.modeDisabled : {}),
                      }}
                      onClick={() => { props.editActivePack(pack.ref) }}
                      onKeyDown={(event) => {
                        if (!editable || state.packs.length < 2) return
                        const last = state.packs.length - 1
                        let next: number | undefined
                        if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
                        if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
                        if (event.key === 'Home') next = 0
                        if (event.key === 'End') next = last
                        if (next === undefined) return
                        event.preventDefault()
                        props.editActivePack(state.packs[next]!.ref)
                        requestAnimationFrame(() => {
                          document.getElementById(`dsh-emoji-pack-option-${String(next)}`)?.focus()
                        })
                      }}
                    >
                      {selected ? <span aria-hidden="true" style={styles.packOptionMark}>✓</span> : null}
                      <span style={styles.packOptionName}>
                        {pack.name}{pack.builtIn ? props.t('pack.builtinSuffix') : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedPack !== undefined
                ? (
                  <div
                    id="dsh-emoji-pack-panel"
                    role="region"
                    aria-labelledby={`dsh-emoji-pack-option-${String(state.packs.indexOf(selectedPack))}`}
                  >
                    <span style={styles.packMeta}>
                      <span>{props.t('pack.emojiCount')}: {selectedPack.emojiCount}</span>
                      {visiblePackRef(selectedPack) === undefined
                        ? null
                        : <span>{visiblePackRef(selectedPack)}</span>}
                    </span>
                    <div style={styles.previews}>
                      {selectedPack.previews.map((preview) => {
                        const copy = PREVIEW_COPY[preview.key]
                        const label = copy === undefined ? preview.label : props.t(copy)
                        return (
                          <img
                            key={preview.key}
                            src={preview.url}
                            alt={label}
                            title={label}
                            data-dsh-emoji-pack-preview="true"
                            style={styles.preview}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
                : null}
              <span style={styles.packActions}>
                <label style={{ ...styles.button, ...styles.upload, ...(!editable ? styles.modeDisabled : {}) }}>
                  {props.t(state.packBusy ? 'pack.uploading' : 'pack.upload')}
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    disabled={!editable}
                    style={styles.hiddenFile}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (file !== undefined) props.uploadPack(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                {selectedPack !== undefined && !selectedPack.builtIn
                  ? (
                    <button
                      type="button"
                      style={styles.button}
                      disabled={!editable || selectedPack.ref === state.persisted.activePack}
                      onClick={() => { props.removePack(selectedPack.ref) }}
                    >
                      {props.t('pack.remove')}
                    </button>
                  )
                  : null}
              </span>
              <span style={styles.description}>{props.t('pack.help')}</span>
            </section>
            <fieldset style={styles.sizeFieldset} disabled={!editable}>
              <legend style={styles.legend}>{props.t('size.legend')}</legend>
              <div style={styles.sizeOptions}>
                {EMOJI_DISPLAY_SIZES.map((displaySize) => {
                  const selected = state.draft.displaySize === displaySize
                  return (
                    <label
                      key={displaySize}
                      title={`${String(EMOJI_DISPLAY_SIZE_EM[displaySize])}em`}
                      style={{
                        ...styles.mode,
                        ...(selected ? styles.modeSelected : {}),
                        ...(!editable ? styles.modeDisabled : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="dsh-emoji-display-size"
                        value={displaySize}
                        style={styles.modeRadio}
                        checked={selected}
                        onChange={() => { props.editDisplaySize(displaySize) }}
                      />
                      <span style={styles.modeTitle}>{props.t(SIZE_COPY[displaySize])}</span>
                    </label>
                  )
                })}
              </div>
              <p style={styles.sizePreview} aria-live="polite">
                <span>{props.t('size.preview.before')}</span>
                {selectedPack?.previews[0] !== undefined
                  ? (
                    <img
                      src={selectedPack.previews[0].url}
                      alt={selectedPack.previews[0].label}
                      style={{
                        display: 'inline-block', width: `${String(displaySizeEm)}em`,
                        height: `${String(displaySizeEm)}em`, margin: '0 0.08em',
                        verticalAlign: `${String(displayAlignEm)}em`, objectFit: 'contain',
                      }}
                    />
                  )
                  : null}
                <span>{props.t('size.preview.after')}</span>
              </p>
            </fieldset>
            <div style={styles.promptField}>
              <div style={styles.promptHeading}>
                <label htmlFor="dsh-emoji-custom-prompt" style={styles.promptLabel}>{props.t('prompt.label')}</label>
                {state.draft.customPrompt.length === 0
                  ? (
                    <button
                      type="button"
                      style={styles.promptExample}
                      disabled={!editable}
                      onClick={() => { props.editCustomPrompt(props.t('prompt.example')) }}
                    >
                      {props.t('action.usePromptExample')}
                    </button>
                  )
                  : null}
              </div>
              <textarea
                id="dsh-emoji-custom-prompt"
                value={state.draft.customPrompt}
                maxLength={MAX_CUSTOM_PROMPT_LENGTH}
                disabled={!editable}
                rows={5}
                style={styles.promptTextarea}
                placeholder={props.t('prompt.placeholder')}
                onChange={event => { props.editCustomPrompt(event.currentTarget.value) }}
              />
              <span style={styles.promptMeta}>
                <span>{props.t('prompt.help')}</span>
                <span>{state.draft.customPrompt.length}/{MAX_CUSTOM_PROMPT_LENGTH}</span>
              </span>
            </div>
            <p style={styles.note}>{props.t('limit.note')}</p>
            {state.error !== undefined ? <p role="status" style={styles.error}>{props.t(ERROR_COPY[state.error])}</p> : null}
            {state.saved ? <p role="status" style={styles.saved}>{props.t('status.saved')}</p> : null}
            {state.packNotice !== undefined
              ? <p role="status" style={styles.saved}>{props.t(state.packNotice === 'uploaded' ? 'status.packUploaded' : 'status.packRemoved')}</p>
              : null}
            <div style={styles.footer}>
              <button type="button" style={styles.button} disabled={!editable || revisionBlocked} onClick={props.reset}>{props.t('action.reset')}</button>
              <button type="button" style={styles.button} disabled={!editable || !state.dirty} onClick={props.discard}>{props.t('action.discard')}</button>
              <button type="button" style={styles.save} disabled={!editable || !state.dirty || revisionBlocked} onClick={props.save}>
                {props.t(state.saving ? 'action.saving' : 'action.save')}
              </button>
            </div>
          </div>
        )
        : null}
    </li>
  )
}
