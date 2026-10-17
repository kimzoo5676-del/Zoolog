// 편집기 도구 막대의 마크다운 편집 (2026-10-16 소유자 요청: 네이버 블로그처럼 도구로 서식 넣기)
// 모두 순수 함수: 본문과 선택 범위를 받아 "바꿀 범위 + 넣을 글자 + 다음 선택 범위"를 돌려줌
// 실제 반영은 MarkdownToolbar가 브라우저 입력(insertText)으로 해서 Ctrl+Z 되돌리기가 그대로 동작

export type Selection = { start: number; end: number }

// 원문의 [from, to)를 text로 바꾸고, 바꾼 뒤 select 범위를 선택
export type Edit = { from: number; to: number; text: string; select: Selection }

// 굵게·기울임·취소선·인라인 코드: 선택한 글자를 표시로 감쌈, 이미 감싸져 있으면 벗김
// 선택이 없으면 자리 표시 글자를 넣고 그 글자를 선택해 바로 타이핑으로 바꿀 수 있게
// 기울임(*)은 굵게(**)의 별과 구분: **굵게** 안에서 누르면 굵게를 벗기지 않고 ***굵게+기울임*** 으로
export function toggleWrap(value: string, sel: Selection, marker: string, placeholder: string): Edit {
  const selected = value.slice(sel.start, sel.end)
  const m = marker.length
  // 선택 밖 바로 옆에 표시가 있는지. 기울임은 붙은 별 개수가 홀수(* 또는 ***)일 때만 (** 는 굵게)
  const starsLeft = () => {
    let k = 0
    while (value[sel.start - 1 - k] === '*') k++
    return k
  }
  const starsRight = () => {
    let k = 0
    while (value[sel.end + k] === '*') k++
    return k
  }
  const isMarkerAt = (from: number, to: number) => {
    if (from < 0 || value.slice(from, to) !== marker) return false
    if (marker !== '*') return true
    return (from < sel.start ? starsLeft() : starsRight()) % 2 === 1
  }
  if (selected && isMarkerAt(sel.start - m, sel.start) && isMarkerAt(sel.end, sel.end + m)) {
    return { from: sel.start - m, to: sel.end + m, text: selected, select: { start: sel.start - m, end: sel.end - m } }
  }
  // 표시까지 함께 선택한 경우(**굵게** 전체 선택)도 벗김
  if (selected.length > 2 * m && selected.startsWith(marker) && selected.endsWith(marker) && (marker !== '*' || !selected.startsWith('**'))) {
    const inner = selected.slice(m, -m)
    return { from: sel.start, to: sel.end, text: inner, select: { start: sel.start, end: sel.start + inner.length } }
  }
  const inner = selected || placeholder
  const start = sel.start + m
  return { from: sel.start, to: sel.end, text: `${marker}${inner}${marker}`, select: { start, end: start + inner.length } }
}

// 선택이 걸친 줄 전체 범위 (선택이 줄바꿈 바로 뒤에서 끝나면 그 다음 줄은 넣지 않음)
function lineRange(value: string, sel: Selection) {
  const from = sel.start === 0 ? 0 : value.lastIndexOf('\n', sel.start - 1) + 1
  const endBreak = value.indexOf('\n', sel.end > sel.start && value[sel.end - 1] === '\n' ? sel.end - 1 : sel.end)
  const to = endBreak < 0 ? value.length : endBreak
  return { from, to }
}

// 소제목·인용·목록·체크리스트: 선택한 줄마다 앞에 표시를 붙임, 모든 줄에 이미 있으면 뗌
// 번호 목록은 1. 2. 3. 으로 이어서 붙임. 다른 줄 표시(## , > , - )가 있으면 바꿔 끼움
// 여러 줄을 고를 때 빈 줄은 그대로 둠, 체크리스트는 체크한 항목(- [x])도 이미 붙은 것으로 봄
const LINE_MARKERS = /^(#{1,6} |> |- \[[ x]\] |- |\d+\. )/

export function toggleLinePrefix(value: string, sel: Selection, prefix: string | 'ordered'): Edit {
  const { from, to } = lineRange(value, sel)
  const lines = value.slice(from, to).split('\n')
  const multi = lines.length > 1
  const skip = (line: string) => multi && line.trim() === ''
  const has = (line: string) =>
    prefix === 'ordered' ? /^\d+\. /.test(line) : prefix === '- [ ] ' ? /^- \[[ x]\] /.test(line) : line.startsWith(prefix)
  const allHave = lines.every((line) => skip(line) || has(line))
  let n = 0
  const next = lines.map((line) => {
    if (skip(line)) return line
    const bare = line.replace(LINE_MARKERS, '')
    if (allHave) return bare
    n += 1
    return `${prefix === 'ordered' ? `${n}. ` : prefix}${bare}`
  })
  const text = next.join('\n')
  // 한 줄이고 선택이 없으면 커서를 줄 끝에, 아니면 바뀐 줄 전체를 선택
  const select = lines.length === 1 && sel.start === sel.end ? { start: from + text.length, end: from + text.length } : { start: from, end: from + text.length }
  return { from, to, text, select }
}

// 코드 블록: 선택한 줄을 ``` 로 감쌈 (선택이 없으면 빈 블록을 만들고 안에 커서)
export function codeBlock(value: string, sel: Selection): Edit {
  const { from, to } = lineRange(value, sel)
  const body = value.slice(from, to)
  const lead = from > 0 && value[from - 1] !== '\n' ? '\n' : ''
  if (!body.trim()) {
    const text = `${lead}\`\`\`\n\n\`\`\``
    const cursor = from + lead.length + 4
    return { from, to, text, select: { start: cursor, end: cursor } }
  }
  const text = `\`\`\`\n${body}\n\`\`\``
  return { from, to, text, select: { start: from + 4, end: from + 4 + body.length } }
}

// 링크: [선택한 글자](주소) 를 만들고 주소 자리를 선택해 바로 붙여 넣을 수 있게
export function link(value: string, sel: Selection): Edit {
  const label = value.slice(sel.start, sel.end) || '링크 글자'
  const url = 'https://'
  const text = `[${label}](${url})`
  const urlStart = sel.start + label.length + 3
  return { from: sel.start, to: sel.end, text, select: { start: urlStart, end: urlStart + url.length } }
}

// 블록 넣기(표·구분선): 커서가 있는 줄 다음에 빈 줄을 두고 넣음
function insertBlock(value: string, sel: Selection, block: string, selectInBlock?: [number, number]): Edit {
  const { to } = lineRange(value, { start: sel.end, end: sel.end })
  const lineHasText = value.slice(value.lastIndexOf('\n', to - 1) + 1, to).trim() !== ''
  const lead = to === 0 ? '' : lineHasText ? '\n\n' : '\n'
  const text = `${lead}${block}\n`
  const base = to + lead.length
  const select = selectInBlock ? { start: base + selectInBlock[0], end: base + selectInBlock[1] } : { start: to + text.length, end: to + text.length }
  return { from: to, to, text, select }
}

export function table(value: string, sel: Selection): Edit {
  const block = '| 항목 | 내용 |\n| --- | --- |\n|  |  |'
  return insertBlock(value, sel, block, [2, 4])
}

export function horizontalRule(value: string, sel: Selection): Edit {
  return insertBlock(value, sel, '---')
}

// 사진 정렬 (2026-10-16): 마크다운에는 정렬 문법이 없어 주소 끝 표시로 정함 ![설명](주소#center)
// 화면(MarkdownContent)이 표시를 읽어 정렬하고, 주소의 # 뒤는 서버로 가지 않아 이미지는 그대로 불러옴
export type ImageAlign = 'left' | 'center' | 'right'
const IMAGE = /!\[([^\]]*)\]\(([^)\s#]+)(?:#(left|center|right))?\)/g

// 선택한 줄들(선택이 없으면 커서가 있는 줄)의 사진에 정렬 표시. 같은 정렬이 이미 있으면 표시를 뗌(기본 정렬로)
// 바꿀 사진이 없으면 null
export function alignImages(value: string, sel: Selection, align: ImageAlign): Edit | null {
  const { from, to } = lineRange(value, sel)
  const part = value.slice(from, to)
  const matches = [...part.matchAll(IMAGE)]
  if (matches.length === 0) return null
  const allSame = matches.every((m) => m[3] === align)
  const text = part.replace(IMAGE, (_, alt: string, url: string) => `![${alt}](${allSame ? url : `${url}#${align}`})`)
  return { from, to, text, select: { start: from, end: from + text.length } }
}

// 화면용: 이미지 주소에서 정렬 표시를 읽어 냄
export function readImageAlign(src: string): { src: string; align: ImageAlign | null } {
  const match = src.match(/^(.*)#(left|center|right)$/)
  return match ? { src: match[1], align: match[2] as ImageAlign } : { src, align: null }
}
