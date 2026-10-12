import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createCategory, type Category } from '../api/category'
import { buildCategoryTree, categoryPath, type CategoryNode } from '../utils/categoryTree'
import { errorMessage } from '../utils/postForm'

type CategoryPickerProps = {
  categories: Category[]
  // 선택한 주제 id (큰 주제 또는 하위 주제), 없으면 ''
  value: string
  onChange: (categoryId: string) => void
  onCreated: (category: Category) => Promise<void>
}

// 단계별 줄 이름 (작은 대문자 라벨)
const ROW_LABELS = ['Category', 'Sub', 'Section']

// 주제 선택: 고른 경로를 따라 줄이 하나씩 열림 (최대 3단계)
// CATEGORY 줄: 큰 주제 칩 + [+](새 큰 주제)
// ↳ SUB 줄(큰 주제를 고르면): 선택 안 함 + 하위 칩 + [+](고른 큰 주제의 하위)
// ↳ SECTION 줄(하위 주제를 고르면): 선택 안 함 + 3단계 칩 + [+]
// 줄 위치로 무엇을 만드는지 구분. 실제 제출 값은 숨은 input categoryId 하나 (가장 깊이 고른 주제)
export function CategoryPicker({ categories, value, onChange, onCreated }: CategoryPickerProps) {
  const tree = buildCategoryTree(categories)
  const path = value ? categoryPath(categories, Number(value)) : []

  async function create(name: string, parentId: number | null) {
    await onCreated(await createCategory(name, parentId))
  }

  // 줄 목록: 0번 줄은 큰 주제, 그다음부터는 바로 위 줄에서 고른 주제의 하위
  const rows: { options: CategoryNode[]; parent: CategoryNode | null }[] = [{ options: tree, parent: null }]
  let level: CategoryNode[] = tree
  for (const picked of path) {
    const node = level.find((n) => n.id === picked.id)
    if (!node || node.depth >= ROW_LABELS.length) break
    rows.push({ options: node.children, parent: node })
    level = node.children
  }

  return (
    <div className="category-picker">
      <input type="hidden" name="categoryId" value={value} />
      {rows.map(({ options, parent }, depth) => {
        const selectedId = path[depth]?.id
        const labelId = `picker-${depth}`
        return (
          <div key={parent?.id ?? 'top'} className={depth === 0 ? 'picker-row' : 'picker-row picker-row-sub'}>
            <span className="picker-label" id={labelId}>
              {ROW_LABELS[depth]}
            </span>
            <div className="picker-options" role="radiogroup" aria-labelledby={labelId}>
              {parent && (
                <label className="chip chip-quiet">
                  {/* name은 같은 줄끼리 묶기 위한 값, 제출은 숨은 categoryId가 담당 */}
                  <input
                    type="radio"
                    name={labelId}
                    checked={selectedId === undefined}
                    onChange={() => onChange(String(parent.id))}
                  />
                  선택 안 함
                </label>
              )}
              {options.map((node) => (
                <label key={node.id} className="chip">
                  <input
                    type="radio"
                    name={labelId}
                    required={depth === 0}
                    checked={selectedId === node.id}
                    onChange={() => onChange(String(node.id))}
                  />
                  {node.name}
                </label>
              ))}
              {parent ? (
                <AddChip
                  label={depth === 1 ? '하위 주제' : '세부 주제'}
                  context={`${parent.name} `}
                  onCreate={(name) => create(name, parent.id)}
                />
              ) : (
                <AddChip label="주제" onCreate={(name) => create(name, null)} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type AddChipProps = {
  // 화면 안내 문구 (예: 하위 주제 → "하위 주제 이름")
  label: string
  // 스크린 리더용 이름 앞에 붙는 맥락 (예: "Cloud Engineer ")
  context?: string
  onCreate: (name: string) => Promise<void>
}

// [+] 칩: 누르면 칩이 옆으로 부드럽게 늘어나며 이름 입력 칸이 나타나고, +는 45도 돌아 ×(닫기)가 됨
// 입력 칸은 항상 렌더링해 두고 CSS 전환(transition)으로 열고 닫음 (갑자기 칸이 생기는 느낌 방지)
// Enter 또는 ↵ 버튼으로 만들기, Esc 또는 × 로 닫기
// 글 폼 안에 있으므로 form 대신 키 처리 (중첩 form 금지, Enter가 글 제출이 되지 않도록 막음)
function AddChip({ label, context = '', onCreate }: AddChipProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function close() {
    setOpen(false)
    setName('')
    setError(null)
  }

  async function submit() {
    if (!name.trim() || pending) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await onCreate(name.trim())
      close()
    } catch (e) {
      setError(errorMessage(e, '주제를 만들지 못했어요'))
    } finally {
      setPending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      close()
    }
  }

  return (
    <>
      <span className={open ? 'chip-add is-open' : 'chip-add'}>
        <button
          type="button"
          className="chip-add-toggle"
          aria-expanded={open}
          aria-label={open ? '닫기' : `${context}${label} 만들기`}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <span className="chip-add-icon" aria-hidden="true">
            +
          </span>
        </button>
        {/* 닫혀 있을 때는 inert: 키보드 이동과 스크린 리더에서 제외 */}
        <span className="chip-add-field" inert={!open}>
          <span className="chip-add-inner">
            <input
              ref={inputRef}
              aria-label={`${context}${label} 이름`}
              placeholder={`${label} 이름`}
              maxLength={50}
              value={name}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="chip-add-submit"
              aria-label="만들기"
              onClick={() => void submit()}
              disabled={pending || !name.trim()}
            >
              ↵
            </button>
          </span>
        </span>
      </span>
      {error && (
        <p className="form-error picker-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
