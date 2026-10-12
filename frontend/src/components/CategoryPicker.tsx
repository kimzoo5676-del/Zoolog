import { useState, type KeyboardEvent } from 'react'
import { createCategory, type Category } from '../api/category'
import { errorMessage } from '../utils/postForm'

type CategoryPickerProps = {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  onCreated: (category: Category) => Promise<void>
}

// 주제 선택 칸: 라디오 버튼을 칩 모양으로 표시 (name="categoryId"로 글 폼과 함께 제출)
// 마지막 칩 "+ 새 주제"를 누르면 그 자리에서 이름 입력 → Enter로 추가
export function CategoryPicker({ categories, value, onChange, onCreated }: CategoryPickerProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function add() {
    if (!name.trim() || pending) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await onCreated(await createCategory(name.trim()))
      setName('')
      setAdding(false)
    } catch (e) {
      setError(errorMessage(e, '주제를 추가하지 못했어요'))
    } finally {
      setPending(false)
    }
  }

  // 글 폼 안의 입력 칸이라 Enter가 글 제출이 되지 않도록 막고 주제 추가로 처리
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void add()
    } else if (event.key === 'Escape') {
      setAdding(false)
      setName('')
      setError(null)
    }
  }

  return (
    <fieldset className="category-picker">
      <legend className="visually-hidden">주제</legend>
      {categories.map((category) => (
        <label key={category.id} className="chip">
          <input
            type="radio"
            name="categoryId"
            value={category.id}
            required
            checked={value === String(category.id)}
            onChange={() => onChange(String(category.id))}
          />
          {category.name}
        </label>
      ))}
      {adding ? (
        <span className="chip-input">
          <input
            aria-label="새 주제 이름"
            placeholder="새 주제 이름"
            maxLength={50}
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button type="button" className="chip" onClick={() => void add()} disabled={pending}>
            추가
          </button>
        </span>
      ) : (
        <button type="button" className="chip chip-add" onClick={() => setAdding(true)}>
          + 새 주제
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
