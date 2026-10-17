import { useLayoutEffect, useRef, type RefObject } from 'react'
import { alignImages } from '../utils/markdownEdit'
import { ALIGNS, GROUPS, runTool, type Tool, type ToolIconName } from '../utils/markdownTools'

type MarkdownToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  // 사진 버튼: 있으면 표시 (글 편집기의 업로드 파일 선택 칸을 엶)
  onPickImage?: () => void
}

// 편집기 도구 막대 (2026-10-16 소유자 요청: 네이버 블로그처럼 서식 도구, 버튼 목록·동작은 utils/markdownTools)
// 선 아이콘 (24×24, currentColor): 글자 기호보다 작은 화면에서도 알아보기 쉽게
const ICON_PATHS: Record<ToolIconName, string> = {
  code: 'M9 7 4 12l5 5M15 7l5 5-5 5',
  quote: 'M7 17c-2 0-3-1.5-3-3.5C4 10 6 7.5 9 7M17 17c-2 0-3-1.5-3-3.5 0-3.5 2-6 5-6.5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  ordered: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1V9M3.5 14.5c.5-1 2.5-1 2.5.5S3.5 17 3.5 19H6',
  check: 'M4 5h5v5H4zM4 14h5v5H4zM12 7.5h8M12 16.5h8M5.5 16.5l1 1 2-2',
  codeblock: 'M4 4h16v16H4zM9 10l-2 2 2 2M15 10l2 2-2 2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  hr: 'M4 12h16',
  alignLeft: 'M4 6h16M4 10h10M4 14h16M4 18h10',
  alignCenter: 'M4 6h16M7 10h10M4 14h16M7 18h10',
  alignRight: 'M4 6h16M10 10h10M4 14h16M10 18h10',
}

function ToolIcon({ name }: { name: ToolIconName }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

export function MarkdownToolbar({ textareaRef, onPickImage }: MarkdownToolbarProps) {
  const use = (run: Tool['run']) => {
    const textarea = textareaRef.current
    if (textarea) runTool(textarea, run)
  }

  // 좁은 화면에서 옆으로 밀어야 할 때 가려진 쪽 끝을 흐리게 (머리글 메뉴 줄과 같은 방식)
  const barRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const update = () => {
      bar.classList.toggle('can-scroll-left', bar.scrollLeft > 1)
      bar.classList.toggle('can-scroll-right', bar.scrollWidth - bar.clientWidth - bar.scrollLeft > 1)
    }
    update()
    bar.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      bar.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="md-toolbar" role="toolbar" aria-label="서식 도구" ref={barRef}>
      {GROUPS.map((group, i) => (
        <div className="md-toolbar-group" key={i}>
          {group.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className={tool.style ? `md-tool is-${tool.style}` : 'md-tool'}
              aria-label={tool.label}
              title={tool.shortcut ? `${tool.label} (Ctrl+${tool.shortcut.toUpperCase()})` : tool.label}
              // 누르는 순간 본문 칸의 선택이 풀리지 않도록 포커스 이동을 막음
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => use(tool.run)}
            >
              {tool.icon ? <ToolIcon name={tool.icon} /> : tool.glyph}
            </button>
          ))}
        </div>
      ))}
      <div className="md-toolbar-group">
        {onPickImage && (
          <button type="button" className="md-tool md-tool-wide" aria-label="사진 넣기" title="사진 넣기" onMouseDown={(e) => e.preventDefault()} onClick={onPickImage}>
            사진
          </button>
        )}
        {ALIGNS.map(({ align, label, icon }) => (
          <button
            key={align}
            type="button"
            className="md-tool"
            aria-label={label}
            title={`${label} (커서가 있는 줄의 사진)`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => use((v, s) => alignImages(v, s, align))}
          >
            <ToolIcon name={icon} />
          </button>
        ))}
      </div>
    </div>
  )
}
