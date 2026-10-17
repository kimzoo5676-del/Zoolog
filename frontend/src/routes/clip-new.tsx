import { useRef, useState } from 'react'
import { data, Form, href, Link, redirect, useNavigation } from 'react-router'
import { createClip, findClippedPostId } from '../api/clip'
import { MarkdownContent } from '../components/MarkdownContent'
import { MarkdownToolbar } from '../components/MarkdownToolbar'
import { handleToolShortcut } from '../utils/markdownTools'
import { RouteError } from '../components/RouteError'
import { clearDraft, draftKey, useDraftAutosave } from '../hooks/useDraftAutosave'
import { usePreviewTip } from '../hooks/usePreviewTip'
import { AutosaveStatus, DraftNotice } from '../components/DraftNotice'
import { clipMarkdown, clipMonthName, clipWeekName, isHttpUrl, parseClipDate } from '../utils/clip'
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
  // 같은 기사를 두 번 스크랩하지 않도록: 이미 썼으면 코멘트 칸 대신 그 글로 가는 링크 (서버도 409로 막음)
  const clippedPostId = await findClippedPostId(articleUrl as string, request.signal)
  return {
    clippedPostId,
    title,
    url: articleUrl as string,
    source: params.get('source')?.trim() ?? '',
    date: params.get('date') as string,
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
    clearDraft(draftKey('clip', String(form.get('url') ?? '')))
    return redirect(href('/posts/:postId', { postId: String(post.id) }))
  } catch (error) {
    return { error: errorMessage(error, '글을 저장하지 못했어요') }
  }
}

// 뉴스 스크랩도 글 편집기와 같은 구성 (2026-10-15 소유자 요청): 머리 칸(경로·제목·원문 보기) → 원문 | 미리보기 → 하단 고정 바
// 제목·주제는 메일 링크로 정해져 있어 고칠 칸이 없고, 본문은 일반 글처럼 마크다운으로 자유롭게 씀(길이 제한 없음)
// 미리보기는 실제로 게시될 글 본문(기사 제목 링크 · 언론사 + 쓴 본문), 좁은 화면은 편집기와 같은 미리보기 팁
// 다른 기사 링크로 바로 옮겨 가도 쓰던 글·임시 저장 자리가 섞이지 않도록 기사 주소마다 새로 그림
export default function ClipNew({ loaderData, actionData }: Route.ComponentProps) {
  return <ClipForm key={loaderData.url} loaderData={loaderData} actionData={actionData} />
}

function ClipForm({ loaderData, actionData }: Pick<Route.ComponentProps, 'loaderData' | 'actionData'>) {
  const { clippedPostId, title, url, source, date, path, heading } = loaderData
  // 아직 스크랩하지 않은 기사면 쓸 수 있음
  const canWrite = clippedPostId === null
  const submitting = useNavigation().state === 'submitting'
  const [comment, setComment] = useState('')
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const tip = usePreviewTip(contentRef)
  // 1분마다 브라우저에 임시 저장 (기사 주소마다 따로)
  const draft = useDraftAutosave(draftKey('clip', url), { comment }, { comment: '' })

  return (
    <Form method="post" viewTransition className="editor" onSubmit={draft.saveNow}>
      <title>뉴스 스크랩 | zoolog</title>
      {draft.pending && canWrite && (
        <DraftNotice
          savedAt={draft.pending.savedAt}
          onRestore={() => {
            setComment(draft.pending?.values.comment ?? '')
            draft.acceptPending()
          }}
          onDiscard={draft.discardPending}
        />
      )}
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
      {canWrite && <MarkdownToolbar textareaRef={contentRef} />}
      {canWrite ? (
        <div className="editor-panes">
          <textarea
            ref={contentRef}
            name="comment"
            className="editor-content"
            aria-label="본문 (마크다운)"
            placeholder="마크다운으로 작성"
            required
            autoFocus
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={handleToolShortcut}
            />
          <section className="editor-preview" aria-label="미리보기" {...tip.previewProps}>
            <MarkdownContent>{clipMarkdown(title, url, source, comment)}</MarkdownContent>
          </section>
        </div>
      ) : (
        <p className="clip-notice">
          이미 스크랩한 기사예요.{' '}
          <Link to={href('/posts/:postId', { postId: String(clippedPostId) })} viewTransition>
            스크랩한 글 보기
          </Link>
        </p>
      )}
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="url" value={url} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="date" value={date} />
      <div className="editor-footer">
        <Link to="/" viewTransition className="button-link">
          나가기
        </Link>
        {canWrite && (
          <button type="button" className="button-link editor-preview-toggle" {...tip.toggleProps}>
            미리보기
          </button>
        )}
        <AutosaveStatus savedAt={draft.savedAt} />
        {actionData?.error && (
          <p className="form-error" role="alert">
            {actionData.error}
          </p>
        )}
        {canWrite && (
          <button type="submit" className="button-solid" disabled={submitting}>
            게시
          </button>
        )}
      </div>
    </Form>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteError error={error} />
}
