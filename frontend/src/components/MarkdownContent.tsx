import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IMAGE_ALT_PLACEHOLDER } from '../utils/imageAlt'

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
  // 편집기의 대체 텍스트 자리 표시를 그대로 두면 빈 alt: 스크린 리더가 "이미지 설명"을 읽지 않도록
  img(props) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { node, alt, ...rest } = props
    // 주소 없는 이미지(편집기의 업로드 중 표시)는 그리지 않음: 빈 src는 현재 페이지를 다시 요청함
    if (!rest.src) return null
    return <img {...rest} alt={alt === IMAGE_ALT_PLACEHOLDER ? '' : alt} loading="lazy" decoding="async" />
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
