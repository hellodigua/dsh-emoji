/** “设置 → 插件”中的 dsh-emoji 配置卡片。 */

import { useState, type CSSProperties } from 'react'
import type {
  InjectFace, PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import {
  EMOJI_MODES, MAX_CUSTOM_PROMPT_LENGTH, type EmojiMode,
} from '../settings-model.ts'
import type {
  EmojiSettingsController, EmojiSettingsSnapshot,
} from './settings-controller.ts'
import { EMOJI_LOCALE_NS } from './locales.ts'

export interface EmojiSettingsCardFace {
  hooks: { emojiSettings: EmojiSettingsController }
  editMode: (mode: EmojiMode) => void
  editCustomPrompt: (value: string) => void
  save: () => void
  discard: () => void
  reset: () => void
}

export type EmojiSettingsCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<typeof EMOJI_LOCALE_NS>
  & InjectFace<EmojiSettingsCardFace>

interface ModeCopy {
  title: string
  description: string
}

const MODE_COPY: Record<EmojiMode, ModeCopy> = {
  off: { title: '关闭', description: '不向 AI 提供表情标签协议，也不转写标签。' },
  auto: { title: '智能', description: '只在轻松、友好且适合表达情绪时使用。' },
  frequent: { title: '高频', description: '大多数适合的日常回答都主动使用一张。' },
}

const styles = {
  card: {
    listStyle: 'none', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12,
    background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)',
  },
  header: {
    width: '100%', border: 0, background: 'none', color: 'inherit', textAlign: 'left',
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
  promptTextarea: {
    boxSizing: 'border-box', width: '100%', minHeight: 112, resize: 'vertical', padding: '9px 10px',
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, font: 'inherit', fontSize: 13,
    lineHeight: 1.55, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-module-platform)',
  },
  promptMeta: {
    display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, lineHeight: '17px',
    color: 'var(--dsw-alias-label-tertiary)',
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

function modeSummary(state: EmojiSettingsSnapshot): string {
  if (state.status === 'loading') return '正在读取设置…'
  if (state.status === 'unavailable') return '设置暂不可用'
  return MODE_COPY[state.persisted.mode].title
}

/** 渲染带暂存、保存、放弃和恢复默认能力的插件卡片。 */
export function EmojiSettingsCard(props: EmojiSettingsCardProps) {
  const [open, setOpen] = useState(false)
  const state = props.useEmojiSettings(snapshot => snapshot)
  const editable = state.status === 'ready' && state.writable && !state.saving
  const title = props.t('title')
  return (
    <li style={styles.card}>
      <button
        type="button"
        style={styles.header}
        aria-expanded={open}
        aria-label={`${props.t(open ? 'collapse' : 'expand')}：${title}`}
        onClick={() => { setOpen(!open) }}
      >
        <span style={styles.headText}>
          <span style={styles.title}>{title}</span>
          <span style={styles.description}>控制 AI 回复中微型表情的使用频率</span>
        </span>
        {state.dirty ? <span style={styles.badge}>未保存</span> : null}
        <span style={styles.badge}>{modeSummary(state)}</span>
        <span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
      </button>
      {open
        ? (
          <div style={styles.body}>
            {state.status === 'loading' ? <p style={styles.status}>正在从 Host 读取配置…</p> : null}
            {state.status === 'unavailable' ? <p style={styles.status}>当前页面不能读取或修改此配置。</p> : null}
            <fieldset style={styles.fieldset} disabled={!editable}>
              <legend style={styles.legend}>回复策略</legend>
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
                      <span style={styles.modeTitle}>{MODE_COPY[mode].title}</span>
                    </label>
                  )
                })}
              </div>
              <p style={styles.modeDescription} aria-live="polite">
                {MODE_COPY[state.draft.mode].description}
              </p>
            </fieldset>
            <label style={styles.promptField}>
              <span style={styles.promptLabel}>自定义提示词</span>
              <textarea
                value={state.draft.customPrompt}
                maxLength={MAX_CUSTOM_PROMPT_LENGTH}
                disabled={!editable}
                rows={5}
                style={styles.promptTextarea}
                placeholder="例如：根据语境选择表情，并放在最相关的句子后。"
                onChange={event => { props.editCustomPrompt(event.currentTarget.value) }}
              />
              <span style={styles.promptMeta}>
                <span>用于控制表情的选择、语气、插入位置和需要跳过表情的场景；协议与合法标签由插件保留。</span>
                <span>{state.draft.customPrompt.length}/{MAX_CUSTOM_PROMPT_LENGTH}</span>
              </span>
            </label>
            <p style={styles.note}>当前版本一轮最多插入一张表情。</p>
            {state.error !== undefined ? <p role="status" style={styles.error}>{state.error}</p> : null}
            {state.saved ? <p role="status" style={styles.saved}>设置已保存，并会从下一次模型调用开始生效。</p> : null}
            <div style={styles.footer}>
              <button type="button" style={styles.button} disabled={!editable} onClick={props.reset}>恢复默认</button>
              <button type="button" style={styles.button} disabled={!editable || !state.dirty} onClick={props.discard}>放弃修改</button>
              <button type="button" style={styles.save} disabled={!editable || !state.dirty} onClick={props.save}>
                {state.saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        )
        : null}
    </li>
  )
}
