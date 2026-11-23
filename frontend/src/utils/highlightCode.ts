import type { Element, ElementContent, Root, RootContent } from 'hast'
import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import gradle from 'highlight.js/lib/languages/gradle'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import properties from 'highlight.js/lib/languages/properties'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

// 코드 블록 문법 강조 rehype 플러그인 (2026-11-23 소유자 요청: ```java 를 적어도 한 가지 색이던 문제)
// 엔진은 lowlight(highlight.js 문법을 hast 트리로 출력). rehype-highlight는 고른 언어만 넘겨도 기본 37개 문법을
// 항상 번들에 넣어(+68 kB gzip 측정) 같은 엔진을 직접 호출. 쓰는 언어만 등록, 별칭(js·ts·tsx·html·sh·yml·toml 등)은 각 문법에 포함
const lowlight = createLowlight({ bash, css, dockerfile, gradle, ini, java, javascript, json, kotlin, properties, python, sql, typescript, xml, yaml })

// ```java → <pre><code class="language-java">. 언어를 안 적었거나 등록 안 된 언어면 그대로(자동 추측 없음)
function languageOf(code: Element) {
  const classes = code.properties.className
  if (!Array.isArray(classes)) return null
  for (const name of classes) {
    if (typeof name === 'string' && name.startsWith('language-')) {
      const language = name.slice('language-'.length)
      return lowlight.registered(language) ? language : null
    }
  }
  return null
}

function textOf(nodes: ElementContent[]): string {
  return nodes.map((n) => (n.type === 'text' ? n.value : n.type === 'element' ? textOf(n.children) : '')).join('')
}

function visit(node: Root | RootContent, parent: Root | Element | null) {
  if (node.type === 'element' && node.tagName === 'code' && parent?.type === 'element' && parent.tagName === 'pre') {
    const language = languageOf(node)
    if (language) {
      const classes = (node.properties.className as (string | number)[]).map(String)
      node.properties.className = ['hljs', ...classes]
      node.children = lowlight.highlight(language, textOf(node.children), { prefix: 'hljs-' }).children as ElementContent[]
    }
    return
  }
  if (node.type === 'root' || node.type === 'element') node.children.forEach((child) => visit(child, node))
}

export function rehypeHighlightCode() {
  return (tree: Root) => visit(tree, null)
}
