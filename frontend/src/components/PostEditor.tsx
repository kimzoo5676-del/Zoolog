import { useState } from 'react'
import { Form, Link, useNavigation, useRevalidator } from 'react-router'
import type { Category } from '../api/category'
import type { PostInput } from '../api/post'
import { CategoryPicker } from './CategoryPicker'
import { MarkdownContent } from './MarkdownContent'

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

  // 새 주제를 추가하면 레이아웃의 주제 목록(메뉴, 칩)을 다시 불러온 뒤 선택
  async function handleCategoryCreated(category: Category) {
    await revalidate()
    setCategoryId(String(category.id))
  }

  return (
    <Form method="post" className="editor">
      <div className="editor-head">
        {/* 제목은 한 줄 값: Enter는 줄바꿈 대신 본문으로 이동 */}
        <textarea
          name="title"
          className="editor-title"
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
              document.getElementById('editor-content')?.focus()
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
          onChange={(event) => setContent(event.target.value)}
        />
        <section className="editor-preview" aria-label="미리보기">
          <MarkdownContent>{content}</MarkdownContent>
        </section>
      </div>
      <div className="editor-footer">
        <Link to={exitTo} className="button-link">
          나가기
        </Link>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button-solid" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </Form>
  )
}
