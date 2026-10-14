import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type PointerEvent } from 'react'
import { Form, Link, useNavigation, useRevalidator } from 'react-router'
import type { Category } from '../api/category'
import { uploadImage } from '../api/image'
import type { PostInput } from '../api/post'
import { CategoryPicker } from './CategoryPicker'
import { MarkdownContent } from './MarkdownContent'
import { IMAGE_ALT_PLACEHOLDER } from '../utils/imageAlt'
import { errorMessage } from '../utils/postForm'

// 나란히 보기(원문 | 미리보기)가 들어가지 않는 폭: index.css의 .editor-panes 기준(60rem)과 같게
const NARROW_EDITOR = '(max-width: 59.99rem)'
const HOVER_OPEN_MS = 450 // 마우스를 이만큼 멈추면 팁 열기 (--dur-ui와 같은 값)
const TYPING_QUIET_MS = 1200 // 마지막 타이핑 뒤 이만큼은 팁을 열지 않음

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

type PostEditorProps = {
  categories: Category[]
  initial?: PostInput
  error?: string
  submitLabel: string
  // 나가기 버튼이 돌아갈 주소
  exitTo: string
}

// 글 작성·수정 공용 편집기 (velog 구성 참고)
// 큰 제목 입력 → 주제 칩 → 원문 | 미리보기 → 하단 고정 바(나가기, 게시)
export function PostEditor({ categories, initial, error, submitLabel, exitTo }: PostEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [categoryId, setCategoryId] = useState(initial ? String(initial.categoryId) : '')
  const [content, setContent] = useState(initial?.content ?? '')
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'
  const { revalidate } = useRevalidator()
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // 본문을 직접 고친 횟수: 올리는 동안 다른 곳을 쓰고 있으면 선택을 옮기지 않기 위해 비교
  const editCountRef = useRef(0)
  // 올라간 이미지의 대체 텍스트 자리 표시를 선택할 대상 (이미지 주소)
  const selectAltRef = useRef<string | null>(null)

  // 좁은 화면(창을 반으로 나눈 경우 등)의 미리보기 팁 (2026-10-15 소유자 요청)
  // 넓은 화면은 원문 | 미리보기 나란히. 좁으면 미리보기를 숨기고, 본문 칸 위에 마우스를 잠깐 멈추면 팁으로 띄움
  // 타이핑하면 바로 닫힘(쓰는 글을 가리지 않도록), 마우스가 없는 기기는 하단 바 미리보기 버튼으로 열고 닫음
  const narrow = useMediaQuery(NARROW_EDITOR)
  const [preview, setPreview] = useState<'closed' | 'hover' | 'pinned'>('closed')
  const previewRef = useRef<HTMLElement>(null)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const lastTypedAt = useRef(0)
  const tipOpen = narrow && preview !== 'closed'

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  // 열릴 때: 보이는 화면 안(머리 위 ~ 하단 고정 바 위)에 맞춰 위치·높이를 정하고,
  // 본문 칸에서 보던 위치와 비슷한 곳을 보여 줌 (스크롤 비율을 맞춤)
  useLayoutEffect(() => {
    const tip = previewRef.current
    const textarea = contentRef.current
    const panes = tip?.parentElement
    if (!tipOpen || !tip || !textarea || !panes) return
    const gap = 12
    const footerTop = tip.closest('form')?.querySelector('.editor-footer')?.getBoundingClientRect().top ?? window.innerHeight
    const panesRect = panes.getBoundingClientRect()
    const top = Math.max(gap, gap - panesRect.top)
    const bottom = Math.min(panesRect.bottom, footerTop) - panesRect.top - gap
    tip.style.top = `${top}px`
    tip.style.maxHeight = `${Math.max(160, bottom - top)}px`
    const ratio = textarea.scrollTop / Math.max(1, textarea.scrollHeight - textarea.clientHeight)
    tip.scrollTop = ratio * (tip.scrollHeight - tip.clientHeight)
  }, [tipOpen])

  // Esc로 닫기
  useEffect(() => {
    if (!tipOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview('closed')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tipOpen])

  // 마우스가 본문 칸 위에 잠깐 멈추면 열기 (지나가기만 하면 열지 않음, 방금 타이핑했으면 기다림)
  function handleContentPointerMove(event: PointerEvent<HTMLTextAreaElement>) {
    if (!narrow || event.pointerType !== 'mouse' || preview !== 'closed') return
    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => {
      if (Date.now() - lastTypedAt.current > TYPING_QUIET_MS) setPreview('hover')
    }, HOVER_OPEN_MS)
  }

  function closeHoverSoon() {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
    // 팁으로 마우스를 옮길 수 있게 조금 늦게 닫음 (Streak 팁과 같은 0.2초)
    closeTimer.current = window.setTimeout(() => setPreview((p) => (p === 'hover' ? 'closed' : p)), 200)
  }

  function handleTyping() {
    lastTypedAt.current = Date.now()
    window.clearTimeout(openTimer.current)
    if (preview === 'hover') setPreview('closed')
  }

  // 이미지 한 장이 올라가면 "이미지 설명"을 선택해 바로 타이핑으로 바꿀 수 있게 함
  useLayoutEffect(() => {
    const url = selectAltRef.current
    const textarea = contentRef.current
    if (!url || !textarea) return
    selectAltRef.current = null
    const start = content.indexOf(`![${IMAGE_ALT_PLACEHOLDER}](${url})`)
    // 제목 칸 등 다른 입력 칸에서 쓰는 중이면 포커스를 빼앗지 않음 (이미지 버튼으로 올린 경우는 본문으로 옮김)
    const active = document.activeElement
    const typingElsewhere = active !== textarea && active instanceof HTMLElement && active.matches('input, textarea, [contenteditable]')
    if (start < 0 || typingElsewhere) return
    textarea.focus()
    textarea.setSelectionRange(start + 2, start + 2 + IMAGE_ALT_PLACEHOLDER.length)
  }, [content])

  // 이미지 넣기: 커서 자리에 "업로드 중" 표시를 먼저 넣고, 올라가면 실제 주소로 바꿈 (여러 장은 동시에)
  // 실패하면 표시를 지우고 하단 바에 이유 표시
  async function insertImages(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (images.length === 0) return
    setUploadError(null)
    const textarea = contentRef.current
    let at = textarea ? textarea.selectionStart : content.length
    let prefix = ''
    // 커서가 줄 중간(예: 방금 쓴 이미지 설명 안)이면 그 줄 다음에 넣음: 마크다운 이미지 문법 안에 끼어들지 않도록
    if (at > 0 && content[at - 1] !== '\n') {
      const lineEnd = content.indexOf('\n', at)
      if (lineEnd < 0) {
        at = content.length
        prefix = '\n'
      } else {
        at = lineEnd + 1
      }
    }
    const placeholders = images.map((file, i) => `![업로드 중: ${file.name} ${Date.now()}-${i}]()`)
    const block = prefix + placeholders.map((p) => `${p}\n`).join('')
    const editCount = editCountRef.current
    setContent((current) => current.slice(0, at) + block + current.slice(at))
    setUploading((n) => n + images.length)
    await Promise.all(
      images.map(async (file, i) => {
        try {
          const url = await uploadImage(file)
          // 한 장일 때만, 그동안 본문을 고치지 않았으면 대체 텍스트 자리 표시를 선택
          if (images.length === 1 && editCountRef.current === editCount) selectAltRef.current = url
          setContent((current) => current.replace(placeholders[i], `![${IMAGE_ALT_PLACEHOLDER}](${url})`))
        } catch (e) {
          setContent((current) => current.replace(`${placeholders[i]}\n`, ''))
          setUploadError(errorMessage(e, '이미지를 올리지 못했어요'))
        } finally {
          setUploading((n) => n - 1)
        }
      }),
    )
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = [...event.clipboardData.files]
    if (files.some((file) => file.type.startsWith('image/'))) {
      event.preventDefault()
      void insertImages(files)
    }
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    setDragging(false)
    const files = [...event.dataTransfer.files]
    if (files.length > 0) {
      event.preventDefault()
      // 놓은 위치에 커서를 두고 넣기는 브라우저마다 달라 현재 커서 자리에 넣음
      void insertImages(files)
    }
  }

  // 새 주제를 추가하면 레이아웃의 주제 목록(메뉴, 칩)을 다시 불러온 뒤 선택
  async function handleCategoryCreated(category: Category) {
    await revalidate()
    setCategoryId(String(category.id))
  }

  return (
    // 저장 후 글 화면으로 갈 때도 화면 전환 (편집기 제목 칸 → 글 화면 제목)
    <Form method="post" viewTransition className="editor">
      <div className="editor-head">
        {/* 제목은 한 줄 값: Enter는 줄바꿈 대신 본문으로 이동 */}
        <textarea
          name="title"
          className="editor-title"
          // 글 화면 제목(h1)과 같은 전환 이름: 수정 들어올 때·나갈 때·저장할 때 제목이 이어서 이동
          style={{ viewTransitionName: 'post-title' }}
          aria-label="제목"
          placeholder="제목"
          required
          maxLength={200}
          rows={1}
          value={title}
          onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              contentRef.current?.focus()
            }
          }}
        />
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          onCreated={handleCategoryCreated}
        />
      </div>
      <div className="editor-panes">
        <textarea
          id="editor-content"
          name="content"
          className="editor-content"
          aria-label="본문 (마크다운)"
          placeholder="마크다운으로 작성"
          required
          value={content}
          onChange={(event) => {
            editCountRef.current += 1
            setContent(event.target.value)
          }}
          onKeyDown={handleTyping}
          onPointerMove={handleContentPointerMove}
          onPointerLeave={closeHoverSoon}
          ref={contentRef}
          onPaste={handlePaste}
          onDragOver={(event) => {
            if ([...event.dataTransfer.types].includes('Files')) {
              event.preventDefault()
              setDragging(true)
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          data-dragging={dragging || undefined}
        />
        {/* 좁은 화면에서는 팁: 항상 그려 두고 data-open만 바꿔 열림·닫힘 모두 서서히. 누르면 닫고 본문 칸으로 */}
        <section
          ref={previewRef}
          className="editor-preview"
          aria-label="미리보기"
          data-open={narrow ? tipOpen : undefined}
          inert={narrow && !tipOpen}
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          onPointerLeave={() => preview === 'hover' && closeHoverSoon()}
          onClick={() => {
            if (!narrow) return
            setPreview('closed')
            contentRef.current?.focus()
          }}
        >
          <MarkdownContent>{content}</MarkdownContent>
        </section>
      </div>
      <div className="editor-footer">
        <Link to={exitTo} viewTransition className="button-link">
          나가기
        </Link>
        {/* 이미지 버튼: 숨은 파일 선택 칸을 엶 (끌어놓기·붙여넣기도 가능) */}
        <button type="button" className="button-link" onClick={() => fileRef.current?.click()}>
          {uploading > 0 ? `이미지 올리는 중 ${uploading}` : '이미지'}
        </button>
        {/* 좁은 화면 전용: 마우스가 없는 기기(휴대폰)·키보드로 미리보기 열고 닫기 */}
        <button
          type="button"
          className="button-link editor-preview-toggle"
          aria-pressed={tipOpen}
          onClick={() => setPreview(tipOpen ? 'closed' : 'pinned')}
        >
          미리보기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          hidden
          onChange={(event) => {
            void insertImages([...(event.target.files ?? [])])
            event.target.value = ''
          }}
        />
        {uploadError && (
          <p className="form-error" role="alert">
            {uploadError}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {/* 이미지가 올라가는 중에는 게시를 막음 (본문에 "업로드 중" 표시가 남지 않도록) */}
        <button type="submit" className="button-solid" disabled={submitting || uploading > 0}>
          {submitLabel}
        </button>
      </div>
    </Form>
  )
}
