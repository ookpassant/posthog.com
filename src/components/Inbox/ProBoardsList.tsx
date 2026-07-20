import React from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Link from 'components/Link'
import './proboards.css'

dayjs.extend(relativeTime)

// ProBoards used to show a "Views" column. We don't track views, so this is a
// deterministic stand-in derived from the reply count — enough to feel like the
// old board without inventing a number that changes on every render.
const derivedViews = (numReplies = 0) => numReplies * 37 + 21

const lastAuthorOf = (question: any) => {
    const { replies, profile } = question
    const replyList = Array.isArray(replies?.data) ? replies.data : Object.values(replies ?? {})
    const lastReply = replyList[replyList.length - 1] as any
    return lastReply?.profile || lastReply?.attributes?.profile || profile
}

const fullName = (p: any) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'A hedgehog'

const threadIcon = (question: any, pinned: boolean) => {
    if (pinned) return '📌'
    if (question.resolved) return '✅'
    if ((question.numReplies || 0) >= 8) return '🔥'
    return '📁'
}

interface ProBoardsRowProps {
    question: any
    pinned?: boolean
    alt?: boolean
    appWindowPath?: string
    onRowClick: () => void
}

const ProBoardsRow = ({ question, pinned = false, alt = false, appWindowPath, onRowClick }: ProBoardsRowProps) => {
    const { subject, numReplies, activeAt, profile, permalink } = question
    const to = `/questions/${permalink}`
    const active = to === appWindowPath
    const latestAuthor = lastAuthorOf(question)

    return (
        <tr className={`pb-r${alt ? ' alt' : ''}`}>
            <td className="pb-ico">{threadIcon(question, pinned)}</td>
            <td className="pb-sub">
                <Link to={to} onClick={onRowClick}>
                    {active ? <b>{subject}</b> : subject}
                </Link>
            </td>
            <td className="pb-startedby">{fullName(profile)}</td>
            <td className="c pb-replies">{numReplies ?? 0}</td>
            <td className="c pb-views">{derivedViews(numReplies)}</td>
            <td className="pb-last">
                {activeAt ? dayjs(activeAt).fromNow() : '—'}
                <br />
                <span>by {fullName(latestAuthor)}</span>
            </td>
        </tr>
    )
}

interface ProBoardsListProps {
    questions: any[]
    pinnedQuestions?: any[]
    isLoading: boolean
    isEmpty: boolean
    appWindowPath?: string
    boardLabel?: string
    onRowClick: () => void
    onNewThread: () => void
}

export default function ProBoardsList({
    questions,
    pinnedQuestions,
    isLoading,
    isEmpty,
    appWindowPath,
    boardLabel,
    onRowClick,
    onNewThread,
}: ProBoardsListProps) {
    const board = boardLabel || 'Latest discussions'
    const rows = [
        ...(pinnedQuestions || []).map((q) => ({ q, pinned: true })),
        ...(questions || []).filter((q) => !q?.pinnedTopics?.[0]).map((q) => ({ q, pinned: false })),
    ]

    return (
        <div className="pb">
            <div className="pb-mast">
                <div className="pb-logo">🦔 PostHog Community</div>
                <div className="pb-tag">a cozy corner of the internet · be kind, search first, ship often</div>
            </div>
            <div className="pb-crumb">
                <Link to="/questions">PostHog Community</Link> » <b>{board}</b>
            </div>
            <div className="pb-toolbar">
                <button type="button" className="pb-btn" onClick={onNewThread}>
                    Start New Thread
                </button>
                <span className="pb-pages">
                    📌 pinned · ✅ solved · 🔥 busy · 📁 open
                </span>
            </div>

            <table className="pb-tbl">
                <tbody>
                    <tr className="pb-cat">
                        <td colSpan={6}>{board}</td>
                    </tr>
                    <tr className="pb-ch">
                        <td />
                        <td>Subject</td>
                        <td className="pb-startedby">Started by</td>
                        <td className="c pb-replies">Replies</td>
                        <td className="c pb-views">Views</td>
                        <td style={{ textAlign: 'right' }}>Last Post</td>
                    </tr>

                    {rows.map(({ q, pinned }, i) => (
                        <ProBoardsRow
                            key={q.id ?? i}
                            question={q}
                            pinned={pinned}
                            alt={i % 2 === 1}
                            appWindowPath={appWindowPath}
                            onRowClick={onRowClick}
                        />
                    ))}

                    {!isLoading && isEmpty && (
                        <tr className="pb-empty">
                            <td colSpan={6}>
                                No threads here yet. Be the first —{' '}
                                <a
                                    href="#new-thread"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        onNewThread()
                                    }}
                                >
                                    start one
                                </a>
                                .
                            </td>
                        </tr>
                    )}
                    {isLoading && (
                        <tr>
                            <td colSpan={6} className="pb-loading">
                                Loading threads…
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="pb-foot">
                Powered by hedgehogs (not ProBoards™) · chatting through a bug is welcome; if you just need it fixed,{' '}
                <Link to="/talk-to-a-human">talk to a human</Link>.
            </div>
        </div>
    )
}
