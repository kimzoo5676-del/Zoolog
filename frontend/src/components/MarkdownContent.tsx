import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 렌더링마다 새 객체를 만들지 않도록 모듈 범위에 고정
const remarkPlugins = [remarkGfm]

const components: Components = {
  // 넓은 표는 감싼 요소에서 가로 스크롤 (table 자체를 display: block으로 바꾸면 일부 스크린 리더에서 표 의미가 사라짐)
  table(props) {
    // node: react-markdown이 넘기는 구문 트리 노드, DOM 속성으로 전달되지 않도록 제외
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { node, ...rest } = props
    return (
      <div className="table-scroll">
        <table {...rest} />
      </div>
    )
  },
  // 이미지: 화면에 가까워질 때 불러오기(lazy), 디코딩은 화면 그리기와 따로(async)
  img(props) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { node, ...rest } = props
    return <img {...rest} loading="lazy" decoding="async" />
  },
}

type MarkdownContentProps = {
  children: string
}

// 원문 HTML은 렌더링하지 않고 글자로 이스케이프 (react-markdown 보안 기본값)
export function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <div className="markdown">
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </Markdown>
    </div>
  )
}
