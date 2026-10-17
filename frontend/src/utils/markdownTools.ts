import type { KeyboardEvent } from 'react'
import {
  codeBlock,
  horizontalRule,
  link,
  table,
  toggleLinePrefix,
  toggleWrap,
  type Edit,
  type ImageAlign,
  type Selection,
} from './markdownEdit'

export type ToolIconName =
  | 'code'
  | 'quote'
  | 'list'
  | 'ordered'
  | 'check'
  | 'codeblock'
  | 'link'
  | 'table'
  | 'hr'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'

export type Tool = {
  label: string
  // 버튼 글자 (아이콘이 없을 때)
  glyph: string
  // 선 아이콘 이름 (components/MarkdownToolbar의 ToolIcon)
  icon?: ToolIconName
  // 글자 모양 그대로 보여 줄 버튼 (B 굵게, I 기울임, S 취소선)
  style?: 'bold' | 'italic' | 'strike'
  shortcut?: string
  run: (value: string, sel: Selection) => Edit | null
}

// 편집기 도구 막대 (2026-10-16 소유자 요청: 네이버 블로그처럼 서식 도구)
// 저장 형식은 그대로 마크다운: 버튼은 커서 자리에 마크다운 문법을 넣음. 단축키 Ctrl/Cmd + B·I·K
export const GROUPS: Tool[][] = [
  [
    { label: '소제목', glyph: 'H2', run: (v, s) => toggleLinePrefix(v, s, '## ') },
    { label: '작은 소제목', glyph: 'H3', run: (v, s) => toggleLinePrefix(v, s, '### ') },
  ],
  [
    { label: '굵게', glyph: 'B', style: 'bold', shortcut: 'b', run: (v, s) => toggleWrap(v, s, '**', '굵은 글자') },
    { label: '기울임', glyph: 'I', style: 'italic', shortcut: 'i', run: (v, s) => toggleWrap(v, s, '*', '기울인 글자') },
    { label: '취소선', glyph: 'S', style: 'strike', run: (v, s) => toggleWrap(v, s, '~~', '지운 글자') },
    { label: '인라인 코드', glyph: '`', icon: 'code', run: (v, s) => toggleWrap(v, s, '`', 'code') },
  ],
  [
    { label: '인용', glyph: '❝', icon: 'quote', run: (v, s) => toggleLinePrefix(v, s, '> ') },
    { label: '목록', glyph: '•', icon: 'list', run: (v, s) => toggleLinePrefix(v, s, '- ') },
    { label: '번호 목록', glyph: '1.', icon: 'ordered', run: (v, s) => toggleLinePrefix(v, s, 'ordered') },
    { label: '체크리스트', glyph: '☐', icon: 'check', run: (v, s) => toggleLinePrefix(v, s, '- [ ] ') },
  ],
  [
    { label: '코드 블록', glyph: '{ }', icon: 'codeblock', run: codeBlock },
    { label: '링크', glyph: '↗', icon: 'link', shortcut: 'k', run: link },
    { label: '표', glyph: '▦', icon: 'table', run: table },
    { label: '구분선', glyph: '—', icon: 'hr', run: horizontalRule },
  ],
]

export const ALIGNS: { align: ImageAlign; label: string; glyph: string; icon: ToolIconName }[] = [
  { align: 'left', label: '사진 왼쪽 정렬', glyph: '⇤', icon: 'alignLeft' },
  { align: 'center', label: '사진 가운데 정렬', glyph: '↔', icon: 'alignCenter' },
  { align: 'right', label: '사진 오른쪽 정렬', glyph: '⇥', icon: 'alignRight' },
]

// 고친 부분만 브라우저 입력으로 바꿈: React onChange가 그대로 불리고, Ctrl+Z로 되돌릴 수 있음
// (execCommand가 안 되는 환경은 값을 직접 바꾸고 input 이벤트를 보냄. 이때는 되돌리기 기록이 남지 않음)
export function applyEdit(textarea: HTMLTextAreaElement, edit: Edit) {
  textarea.focus()
  textarea.setSelectionRange(edit.from, edit.to)
  const inserted = edit.text ? document.execCommand('insertText', false, edit.text) : document.execCommand('delete')
  if (!inserted) {
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setValue?.call(textarea, textarea.value.slice(0, edit.from) + edit.text + textarea.value.slice(edit.to))
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }
  textarea.setSelectionRange(edit.select.start, edit.select.end)
}

export function runTool(textarea: HTMLTextAreaElement, run: Tool['run']) {
  const edit = run(textarea.value, { start: textarea.selectionStart, end: textarea.selectionEnd })
  if (edit) applyEdit(textarea, edit)
  else textarea.focus()
}

// 본문 칸 단축키 (onKeyDown에 연결): Ctrl/Cmd + B 굵게, I 기울임, K 링크
export function handleToolShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
  const tool = GROUPS.flat().find((t) => t.shortcut === event.key.toLowerCase())
  if (!tool) return
  event.preventDefault()
  runTool(event.currentTarget, tool.run)
}
