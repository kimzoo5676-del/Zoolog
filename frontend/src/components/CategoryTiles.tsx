import type { CSSProperties } from 'react'
import { href, Link } from 'react-router'
import type { Category } from '../api/category'
import { categoryTitleTransition, topTileTransition } from '../utils/viewTransition'
import { RollText } from './RollText'

type CategoryTilesProps = {
  tiles: { category: Category; postCount: number }[]
  // 한 줄 칸 수: 큰 주제 화면 2, 하위 주제 화면 4 (단계가 깊어질수록 판이 잘게 나뉨)
  columns: 2 | 4
  // 그래프에서 넘어오는 Category 화면: 칸마다 전환 이름(tile-<id>)을 줘 모여든 별이 칸 자리로 날아와 칸이 됨
  quick?: boolean
}

// 하위 주제 칸 (2026-10-13 소유자 결정: 주제 화면은 글 목록 대신 하위 주제를 칸으로)
// 큰 주제 화면은 한 줄 2칸, 하위 주제 화면은 한 줄 4칸. 색은 러스트 · 진한 러스트 바둑판 (CSS nth-child, 좁은 화면에서 칸 수가 바뀌어도 유지)
// 판 전체는 화면이 바뀔 때 하나의 전환 이름(category-board)이라 2칸 판이 서서히 4칸 판으로 바뀜
// 누르면 칸의 이름이 다음 화면 제목 자리로 이어서 이동 (공유 요소 전환)
// 전환 이름은 주제 id별(cat-80): 한 화면 안에서 겹치지 않고, 칸 이름 ↔ 다음 화면 제목이 같은 이름으로 짝이 됨
// 뒤로 가기도 제목 → 칸으로 되돌아감. 모양은 class(category-title)로 한 번에 지정
export function CategoryTiles({ tiles, columns, quick }: CategoryTilesProps) {
  return (
    <ul className={`category-tiles is-${columns}${quick ? ' is-quick' : ''}`} aria-label="하위 주제">
      {tiles.map(({ category, postCount }, i) => {
        return (
          <li
            key={category.id}
            className="category-tile"
            style={{ '--i': i, ...(quick && topTileTransition(category.id)) } as CSSProperties}
          >
            <TileLink category={category} postCount={postCount} />
          </li>
        )
      })}
      {/* 빈 칸: 마지막 줄을 바둑판 색으로 채움 */}
      {Array.from({ length: (columns - (tiles.length % columns)) % columns }, (_, k) => (
        <li key={`empty-${k}`} className="category-tile is-empty" aria-hidden="true" />
      ))}
    </ul>
  )
}

function TileLink({ category, postCount }: { category: Category; postCount: number }) {
  const to = href('/categories/:slug', { slug: category.slug })
  return (
    <Link to={to} viewTransition className="category-tile-link roll-trigger">
      <span className="category-tile-name" style={categoryTitleTransition(category.id)}>
        <RollText>{category.name}</RollText>
      </span>
      <span className="category-tile-count">
        {String(postCount).padStart(2, '0')} {postCount === 1 ? 'POST' : 'POSTS'}
      </span>
    </Link>
  )
}
