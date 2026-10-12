import { useEffect, useState } from 'react'
import { fetchCategories, type Category } from './api/category'

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    fetchCategories()
      .then((data) => {
        if (!ignore) setCategories(data)
      })
      .catch((e: unknown) => {
        if (!ignore) setError(e instanceof Error ? e.message : '알 수 없는 오류')
      })

    return () => {
      ignore = true
    }
  }, [])

  if (error) return <p>{error}</p>

  return (
    <main>
      <h1>zoolog</h1>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </main>
  )
}

export default App