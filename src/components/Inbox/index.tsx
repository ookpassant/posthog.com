import React, { useEffect, useRef, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuestions } from 'hooks/useQuestions'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { TreeMenu } from 'components/TreeMenu'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Question, QuestionForm } from 'components/Squeak'
import OSButton from 'components/OSButton'
import { IconSidePanel, IconBottomPanel, IconChevronDown, IconNotification } from '@posthog/icons'
import Switch from 'components/RadixUI/Switch'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'
import { useToast } from '../../context/Toast'
import { QuestionData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import { navigate } from 'gatsby'
import { useInView } from 'react-intersection-observer'
import useTopicsNav from '../../navs/useTopicsNav'
import { useWindow } from '../../context/Window'
import Tooltip from 'components/RadixUI/Tooltip'
import { DebugContainerQuery } from 'components/DebugContainerQuery'
import { useSubscribedQuestions } from 'hooks/useSubscribedQuestions'
import { flattenStrapiResponse } from '../../utils'
import { useApp } from '../../context/App'
import Link from 'components/Link'
import { Select } from 'components/RadixUI/Select'
import SEO from 'components/seo'
import SearchProvider, { useSearch } from 'components/Editor/SearchProvider'
import { InlineSearch, AlgoliaSearchResults } from 'components/Search/InlineSearch'
import ProBoardsList from './ProBoardsList'
dayjs.extend(relativeTime)

const Menu = ({ onValueChange }: { onValueChange: (value: string) => void }) => {
    const { user } = useUser()
    const topicsNav = useTopicsNav()
    const { appWindow } = useWindow()

    const filteredTopicsNav = useMemo(() => {
        return [
            ...(user
                ? [
                      {
                          name: 'My subscriptions',
                          url: '/questions/subscriptions',
                          icon: <IconNotification />,
                      },
                  ]
                : []),
            ...topicsNav,
        ]
    }, [topicsNav])

    const defaultValue = useMemo(() => {
        return filteredTopicsNav.find((topic) => topic.url === appWindow?.path)?.url || filteredTopicsNav[0]?.url
    }, [appWindow?.path])

    useEffect(() => {
        onValueChange(defaultValue)
    }, [])

    return (
        <>
            <div className="@2xl:hidden">
                <Select
                    className="w-full border-none rounded-none"
                    placeholder="Navigate to a topic"
                    defaultValue={defaultValue}
                    onValueChange={(value) => {
                        onValueChange(value)
                        navigate(value)
                    }}
                    groups={[
                        {
                            label: 'Topics',
                            items: filteredTopicsNav.map((topic) => ({
                                label: topic.name,
                                value: topic.url,
                            })),
                        },
                    ]}
                />
            </div>

            <div className="hidden @2xl:block">
                <ScrollArea className="p-2">
                    <TreeMenu key={user?.id} watchPath={false} items={filteredTopicsNav} />
                </ScrollArea>
            </div>
        </>
    )
}

const SidebarContent = ({
    onMenuValueChange,
    onSubmitQuestion,
}: {
    onMenuValueChange: (value: string) => void
    onSubmitQuestion: () => void
}) => {
    const { addWindow } = useApp()
    const { searchQuery } = useSearch()
    const isSearching = searchQuery.length >= 2

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-primary">
                <div className="px-2 mt-2 pb-2">
                    <OSButton
                        variant="primary"
                        size="md"
                        width="full"
                        onClick={() =>
                            addWindow(
                                <AskAQuestion
                                    newWindow
                                    location={{ pathname: `ask-a-question` }}
                                    key={`ask-a-question`}
                                    onSubmit={onSubmitQuestion}
                                />
                            )
                        }
                    >
                        Ask a question
                    </OSButton>
                </div>
            </div>
            <ScrollArea className="h-full">
                <InlineSearch
                    placeholder="Search questions..."
                    className="p-2 @2xl:pb-0 @2xl:border-b-0 border-b border-primary"
                />
                {isSearching ? (
                    <div className="p-2">
                        <AlgoliaSearchResults facetFilters={['type:question']} />
                    </div>
                ) : (
                    <Menu onValueChange={onMenuValueChange} />
                )}
            </ScrollArea>
        </div>
    )
}

const SIDE_WIDTH_DEFAULT = 600

const layoutOptions = [
    {
        label: 'Stacked view',
        value: 'stacked',
        icon: <IconBottomPanel className="size-4" />,
    },
    {
        label: 'Side-by-side view',
        value: 'side-by-side',
        icon: <IconSidePanel className="size-4" />,
    },
]

interface QuestionToolbarProps {
    containerRef: React.RefObject<HTMLDivElement>
    bottomContainerRef: React.RefObject<HTMLDivElement>
    setBottomHeight: (height: number) => void
    question: StrapiRecord<QuestionData> | undefined
    user: any
    notificationsEnabled: boolean
    setNotificationsEnabled: (enabled: boolean) => void
    setSubscription: (params: { contentType: 'topic' | 'question'; id: string | number; subscribe: boolean }) => void
    addToast: (toast: any) => void
    sideBySide: boolean
    handleSideBySide: (sideBySide: boolean) => void
    expandable: boolean
    expandOrCollapse: (expandable: boolean) => void
    isMobile: boolean
    menuValue: string
}

const QuestionToolbar = ({
    containerRef,
    bottomContainerRef,
    setBottomHeight,
    question,
    user,
    notificationsEnabled,
    setNotificationsEnabled,
    setSubscription,
    addToast,
    sideBySide,
    handleSideBySide,
    expandable,
    expandOrCollapse,
    isMobile,
    menuValue,
}: QuestionToolbarProps) => {
    return (
        <div className="bg-accent border-t border-primary px-4 py-2 flex gap-2 items-center sticky bottom-0 z-10">
            <OSButton
                variant="secondary"
                size="xs"
                onClick={() => {
                    if (!containerRef.current) return
                    const containerHeight = containerRef.current.getBoundingClientRect().height
                    setBottomHeight(containerHeight)
                    document.getElementById('question-form-button')?.click()
                    setTimeout(() => {
                        const viewport = bottomContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]')
                        viewport?.scrollTo({
                            top: viewport.scrollHeight,
                            behavior: 'smooth',
                        })
                    }, 300)
                }}
            >
                Reply
            </OSButton>
            <div className="ml-auto flex space-x-2">
                {question?.id && user && (
                    <Switch
                        checked={notificationsEnabled}
                        onChange={(checked) => {
                            setNotificationsEnabled(checked)
                            setSubscription({
                                contentType: 'question',
                                id: question.id,
                                subscribe: checked,
                            })
                            addToast({
                                description: checked
                                    ? "You'll be notified of replies by email."
                                    : "You won't receive notifications for this thread.",
                                title: checked ? 'Thread notifications enabled' : 'Thread notifications disabled',
                                onUndo: () => {
                                    setNotificationsEnabled(!checked)
                                    setSubscription({
                                        contentType: 'question',
                                        id: question.id,
                                        subscribe: !checked,
                                    })
                                },
                            })
                        }}
                        label="Thread notifications"
                    />
                )}

                <div className="ml-2 pl-2 border-l border-primary flex items-center gap-1">
                    <ToggleGroup
                        title="Layout"
                        hideTitle={true}
                        options={layoutOptions}
                        onValueChange={(value) => handleSideBySide(value === 'side-by-side')}
                        value={sideBySide ? 'side-by-side' : 'stacked'}
                        size="sm"
                    />
                    <Tooltip
                        trigger={
                            <span>
                                <OSButton
                                    size="sm"
                                    className="relative"
                                    style={{ width: 26, height: 26 }}
                                    icon={
                                        <IconChevronDown
                                            className={`w-6 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 ${
                                                sideBySide
                                                    ? expandable
                                                        ? 'rotate-90'
                                                        : '-rotate-90'
                                                    : expandable
                                                    ? 'rotate-180'
                                                    : ''
                                            }`}
                                        />
                                    }
                                    onClick={() => {
                                        if (isMobile && sideBySide) {
                                            navigate(menuValue)
                                        } else {
                                            expandOrCollapse(expandable)
                                        }
                                    }}
                                />
                            </span>
                        }
                    >
                        {expandable ? 'Expand' : 'Collapse'}
                    </Tooltip>
                </div>
            </div>
        </div>
    )
}

const AskAQuestion = ({ onSubmit }: { onSubmit: () => void }) => {
    const { addToast } = useToast()
    const { appWindow } = useWindow()
    const { closeWindow, setWindowTitle } = useApp()

    useEffect(() => {
        setWindowTitle(appWindow, 'Ask a question')
    }, [])

    return (
        <div data-scheme="secondary" className="bg-primary size-full p-4">
            <QuestionForm
                showTopicSelector
                onSubmit={(_values, _type, data) => {
                    onSubmit()
                    closeWindow(appWindow)
                    if (data?.attributes?.permalink) {
                        setTimeout(() => {
                            navigate(`/questions/${data.attributes.permalink}`, {
                                state: { askMax: true },
                            })
                        }, 0)
                    }
                }}
                initialView="question-form"
                slug="/questions"
            />
        </div>
    )
}

export default function Inbox(props) {
    const { data, params } = props
    const initialTopicID = data?.topic?.squeakId
    const permalink = params?.permalink
    const defaultFilters = {
        subject: {
            $ne: '',
        },
        slugs: {
            slug: {
                $notContainsi: '/community/profiles',
            },
        },
        topics: { id: { $eq: initialTopicID } },
    }
    const [ready, setReady] = useState(props.path !== '/questions/subscriptions')
    const [filters, setFilters] = useState(defaultFilters)
    const { addToast } = useToast()
    const { addWindow } = useApp()
    const { user, setSubscription, isSubscribed, isValidating } = useUser()
    const { questions, isLoading, fetchMore, hasMore, refresh, pinnedQuestions } = useQuestions({
        limit: 20,
        sortBy: 'activity',
        filters,
    })
    const { appWindow } = useWindow()
    const bottomHeightDefault = useMemo(() => ((appWindow?.size.height || 0) * 3) / 5, [appWindow?.size.height])
    const [bottomHeight, setBottomHeight] = useState(bottomHeightDefault)
    const [sideWidth, setSideWidth] = useState(SIDE_WIDTH_DEFAULT)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [question, setQuestion] = useState<StrapiRecord<QuestionData>>()
    const containerRef = useRef<HTMLDivElement>(null)
    const bottomContainerRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartHeight, setDragStartHeight] = useState(0)
    const [dragStartWidth, setDragStartWidth] = useState(0)
    const [lastQuestionRef, inView] = useInView({ threshold: 0.1 })
    const [sideBySide, setSideBySide] = useState(false)
    const [showSubscribedQuestions, setShowSubscribedQuestions] = useState(false)
    const { questions: subscribedQuestions } = useSubscribedQuestions()
    const [menuValue, setMenuValue] = useState('')
    const isMobile = useMemo(() => appWindow?.size.width < 896, [appWindow?.size.width])

    const expandable = useMemo(() => {
        if (!containerRef.current) return true
        const containerRect = containerRef.current.getBoundingClientRect()
        if (sideBySide) {
            return isMobile ? sideWidth <= 0 : sideWidth <= 400
        } else {
            return bottomHeight <= containerRect.height / 2
        }
    }, [bottomHeight, sideWidth, sideBySide, containerRef.current, isMobile])

    const handleSideBySide = (sideBySide: boolean) => {
        setSideBySide(sideBySide)
        localStorage.setItem('sideBySide', sideBySide.toString())
    }

    const expandOrCollapse = (expandable: boolean) => {
        if (!containerRef.current) return
        if (sideBySide) {
            const containerWidth = containerRef.current.getBoundingClientRect().width
            const minWidth = isMobile ? 0 : 400
            setSideWidth(expandable ? containerWidth : minWidth)
        } else {
            const containerHeight = containerRef.current.getBoundingClientRect().height
            const minHeight = 45
            setBottomHeight(expandable ? containerHeight : minHeight)
        }
    }

    const handleVerticalDrag = (_event, info) => {
        if (!containerRef.current) return
        const containerHeight = containerRef.current.getBoundingClientRect().height
        const newBottomHeight = Math.min(Math.max(dragStartHeight - info.offset.y, 45), containerHeight)
        setBottomHeight(newBottomHeight)
    }

    const handleHorizontalDrag = (_event, info) => {
        if (!containerRef.current) return
        const containerWidth = containerRef.current.getBoundingClientRect().width
        const newSideWidth = Math.min(Math.max(dragStartWidth - info.offset.x, 400), containerWidth)
        setSideWidth(newSideWidth)
    }

    useEffect(() => {
        if (inView && hasMore) {
            fetchMore()
        }
    }, [inView, hasMore])

    useEffect(() => {
        if (initialTopicID && initialTopicID !== filters.topics?.id?.$eq) {
            const { id, ...newFilters } = filters
            setFilters({ ...newFilters, topics: { id: { $eq: initialTopicID } } })
        }
    }, [initialTopicID])

    useEffect(() => {
        if (user && question?.id) {
            isSubscribed('question', question.id).then((subscribed) => setNotificationsEnabled(subscribed))
        }
    }, [question, user])

    useEffect(() => {
        if (props.path === '/questions/subscriptions') {
            if (user) {
                setShowSubscribedQuestions(true)
            } else {
                navigate('/questions')
            }
            setReady(true)
        } else if (props.path === '/questions' || initialTopicID) {
            setShowSubscribedQuestions(false)
            setFilters(defaultFilters)
        }
    }, [isValidating, props.path])

    useEffect(() => {
        const sideBySide = localStorage.getItem('sideBySide')
        if (sideBySide) {
            setSideBySide(sideBySide === 'true')
        }
    }, [])

    useEffect(() => {
        if (!containerRef.current) return
        const containerRect = containerRef.current.getBoundingClientRect()

        if (sideBySide) {
            setSideWidth(Math.max(400, SIDE_WIDTH_DEFAULT))
        } else {
            setBottomHeight(Math.max(containerRect.height / 2, bottomHeightDefault))
        }
    }, [sideBySide])

    useEffect(() => {
        if (isMobile && sideBySide && containerRef.current) {
            setSideWidth(containerRef.current.getBoundingClientRect().width)
        }
    }, [isMobile, sideBySide, containerRef.current, appWindow?.size.width])

    return (
        <>
            <SEO title={(permalink && question?.attributes.subject) || data?.topic?.label || 'Forums'} />
            {ready ? (
                <div className="@container w-full h-full flex flex-col">
                    <div data-scheme="secondary" className={`flex @2xl:flex-row flex-col flex-grow min-h-0`}>
                        <aside
                            data-scheme="secondary"
                            className="w-full @2xl:w-64 bg-primary flex-shrink-0 @2xl:border-r border-primary @2xl:h-full"
                        >
                            <SearchProvider>
                                <SidebarContent onMenuValueChange={setMenuValue} onSubmitQuestion={refresh} />
                            </SearchProvider>
                        </aside>
                        <main
                            data-scheme="primary"
                            className="flex-1 bg-primary overflow-hidden border-primary @2xl:border-none border-t"
                        >
                            <div
                                ref={containerRef}
                                className={`flex flex-row h-full ${sideBySide ? 'flex-row' : 'flex-col'}`}
                            >
                                <div className={`@container flex-1 min-h-0 text-sm ${sideBySide ? 'w-0' : 'w-full'}`}>
                                    <ScrollArea className="h-full">
                                        <ProBoardsList
                                            questions={
                                                showSubscribedQuestions
                                                    ? subscribedQuestions
                                                    : flattenStrapiResponse(questions.data)
                                            }
                                            pinnedQuestions={showSubscribedQuestions ? [] : pinnedQuestions}
                                            isLoading={isLoading}
                                            isEmpty={
                                                (showSubscribedQuestions
                                                    ? !subscribedQuestions || subscribedQuestions.length === 0
                                                    : !questions.data || questions.data.length === 0) &&
                                                (!pinnedQuestions || pinnedQuestions.length === 0)
                                            }
                                            appWindowPath={appWindow?.path}
                                            boardLabel={
                                                showSubscribedQuestions ? 'My subscriptions' : data?.topic?.label
                                            }
                                            onRowClick={() => {
                                                if (!containerRef.current) return
                                                if (bottomHeight <= 45) {
                                                    setBottomHeight(
                                                        containerRef.current.getBoundingClientRect().height * 0.8
                                                    )
                                                }
                                            }}
                                            onNewThread={() =>
                                                addWindow(
                                                    <AskAQuestion
                                                        newWindow
                                                        location={{ pathname: `ask-a-question` }}
                                                        key={`ask-a-question`}
                                                        onSubmit={refresh}
                                                    />
                                                )
                                            }
                                        />
                                        {/* Sentinel keeps the existing infinite-scroll (useInView) working. */}
                                        <div ref={lastQuestionRef} />
                                    </ScrollArea>
                                </div>
                                <AnimatePresence>
                                    {permalink && (
                                        <motion.div
                                            ref={bottomContainerRef}
                                            className={`flex-none relative min-h-0 min-w-0 ${
                                                !isDragging ? 'transition-all duration-200 ease-out' : ''
                                            } ${
                                                sideBySide ? '@4xl:border-l border-primary' : 'border-t border-primary'
                                            }`}
                                            initial={{
                                                width: 0,
                                            }}
                                            animate={{
                                                height: sideBySide ? '100%' : bottomHeight,
                                                width: sideBySide ? sideWidth : '100%',
                                            }}
                                            exit={{
                                                width: 0,
                                            }}
                                            transition={{
                                                type: 'tween',
                                                ...(isDragging ? { duration: 0 } : {}),
                                            }}
                                        >
                                            {sideBySide ? (
                                                <motion.div
                                                    data-scheme="tertiary"
                                                    className="w-1.5 cursor-ew-resize top-0 left-0 !transform-none absolute z-20 h-full hover:bg-accent active:bg-accent @4xl:block hidden"
                                                    drag="x"
                                                    dragMomentum={false}
                                                    dragConstraints={{ left: 0, right: 0 }}
                                                    onMouseDown={() => {
                                                        setIsDragging(true)
                                                        setDragStartWidth(sideWidth)
                                                    }}
                                                    onDragEnd={() => setIsDragging(false)}
                                                    onDrag={handleHorizontalDrag}
                                                    onDoubleClick={() => expandOrCollapse(expandable)}
                                                />
                                            ) : (
                                                <motion.div
                                                    data-scheme="tertiary"
                                                    className="h-1.5 cursor-ns-resize top-0 left-0 !transform-none absolute z-20 w-full hover:bg-accent active:bg-accent @4xl:block hidden"
                                                    drag="y"
                                                    dragMomentum={false}
                                                    dragConstraints={{ top: 0, bottom: 0 }}
                                                    onDragStart={() => {
                                                        setIsDragging(true)
                                                        setDragStartHeight(bottomHeight)
                                                    }}
                                                    onDragEnd={() => setIsDragging(false)}
                                                    onDrag={handleVerticalDrag}
                                                    onDoubleClick={() => expandOrCollapse(expandable)}
                                                />
                                            )}

                                            <ScrollArea>
                                                <div className="pb-[64px]">
                                                    <Question
                                                        key={permalink}
                                                        id={permalink}
                                                        onQuestionReady={(question) => setQuestion(question)}
                                                        subscribeButton={false}
                                                        showSlug
                                                        isInForum={true}
                                                        onPinTopics={refresh}
                                                    />
                                                </div>
                                            </ScrollArea>
                                            <QuestionToolbar
                                                containerRef={containerRef}
                                                bottomContainerRef={bottomContainerRef}
                                                setBottomHeight={setBottomHeight}
                                                question={question}
                                                user={user}
                                                notificationsEnabled={notificationsEnabled}
                                                setNotificationsEnabled={setNotificationsEnabled}
                                                setSubscription={setSubscription}
                                                addToast={addToast}
                                                sideBySide={sideBySide}
                                                handleSideBySide={handleSideBySide}
                                                expandable={expandable}
                                                expandOrCollapse={expandOrCollapse}
                                                isMobile={isMobile}
                                                menuValue={menuValue}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </main>
                    </div>
                </div>
            ) : null}
        </>
    )
}
