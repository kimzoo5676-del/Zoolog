import { data, Form, href, Link, redirect, useNavigation } from 'react-router'
import { createClip } from '../api/clip'
import { RouteError } from '../components/RouteError'
import { clipMonthName, clipWeekName, isHttpUrl, parseClipDate } from '../utils/clip'
import { errorMessage } from '../utils/postForm'
import { requireOwner } from '../utils/requireOwner'
import type { Route } from './+types/clip-new'

// 뉴스 스크랩 코멘트 화면 (소유자 전용): 아침 기사 메일의 "코멘트 쓰기" 링크가 기사 정보를 주소에 담아 엶
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url)
  await requireOwner(request.signal, url.pathname + url.search)
  const params = url.searchParams
  const date = parseClipDate(params.get('date'))
  const title = params.get('title')?.trim()
  const articleUrl = params.get('url')
  if (!title || !date || !isHttpUrl(articleUrl)) {
    // RouteError는 404일 때 문구를 그대로 보여 줌
    throw data('기사 정보가 없어요. 메일의 링크로 다시 들어와 주세요', { status: 404 })
  }
  return {
    title,
    url: articleUrl as string,
    source: params.get('source')?.trim() ?? '',
    date: params.get('date') as string,
    question: params.get('q')?.trim() || '이 기사에 대한 생각을 한두 문장으로',
    path: `News Clipping / ${clipMonthName(date)} / ${clipWeekName(date)}`,
    heading: `${date.getMonth() + 1}.${date.getDate()} ${title}`,
  }
}

// 게시 성공 시 새 글로 이동, 실패 시 오류 문구 반환 (쓴 코멘트는 화면에 그대로 남음)
export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData()
  try {
    const post = await createClip({
      title: String(form.get('title') ?? ''),
      url: String(form.get('url') ?? ''),
      source: String(form.get('source') ?? ''),
      date: String(form.get('date') ?? ''),
      comment: String(form.get('comment') ?? ''),
    })
    return redirect(href('/posts/:postId', { postId: String(post.id) }))
  } catch (error) {
    return { error: errorMessage(error, '글을 저장하지 못했어요') }
  }
}

export default function ClipNew({ loaderData, actionData }: Route.ComponentProps) {
  const { title, url, source, date, question, path, heading } = loaderData
  const submitting = useNavigation().state === 'submitting'

  return (
    <Form method="post" viewTransition className="clip-form">
      <title>뉴스 스크랩 | zoolog</title>
      <div className="editor-head">
        <p className="eyebrow">{path}</p>
        <h1 className="clip-title page-heading">{heading}</h1>
        <p className="clip-source">
          {source && <span>{source}</span>}
          <a href={url} target="_blank" rel="noopener noreferrer">
            원문 보기
          </a>
        </p>
      </div>
      <div className="clip-body">
        <label htmlFor="clip-comment" className="clip-question">
          {question}
        </label>
        <textarea
          id="clip-comment"
          name="comment"
          className="clip-comment"
          rows={4}
          maxLength={500}
          required
          autoFocus
        />
      </div>
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="url" value={url} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="date" value={date} />
      <div className="editor-footer">
        <Link to="/" viewTransition className="button-link">
          나가기
        </Link>
        {actionData?.error && (
          <p className="form-error" role="alert">
            {actionData.error}
          </p>
        )}
        <button type="submit" className="button-solid" disabled={submitting}>
          게시
        </button>
      </div>
    </Form>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
