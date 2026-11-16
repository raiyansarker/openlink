import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { HStack } from '@astryxdesign/core/HStack'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { VStack } from '@astryxdesign/core/VStack'
import { InlineShortcut } from '#/components/create-link/LinkPreviewPanel'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { LinkComment } from '#/data/demo/types'
import type { ThreadComment } from '#/hooks/use-link-thread'
import { MAX_COMMENT_LENGTH as COMMENT_MAX_LENGTH } from '@openlink/contracts'

/** The signed-in person reading the thread. */
export type CommentViewer = { id: string; name: string; avatarUrl?: string }

const ViewerContext = createContext<CommentViewer>({ id: '', name: '' })

type LinkCommentsProps = {
  viewer: CommentViewer
  comments: ThreadComment[]
  /** First load: shows the thread's shape instead of an empty conversation. */
  isLoading?: boolean
  loadError?: unknown
  onRetry?: () => void
  /** Each rejects with an Error carrying a message to show. */
  onAdd: (body: string) => Promise<unknown>
  onEdit: (commentId: string, body: string) => Promise<unknown>
  onDelete: (commentId: string) => Promise<unknown>
  onToggleReaction: (commentId: string, emoji: string) => Promise<unknown>
}

const REACTIONS: { emoji: string; name: string }[] = [
  { emoji: '👍', name: 'Thumbs up' },
  { emoji: '🎉', name: 'Celebrate' },
  { emoji: '👀', name: 'Looking' },
  { emoji: '✅', name: 'Done' },
  { emoji: '❤️', name: 'Love' },
  { emoji: '🔥', name: 'Fire' },
]

/** One-click starters for the empty composer: the context teams usually want. */
const PROMPTS = [
  { label: 'Where it’s shared', text: 'Shared in: ' },
  { label: 'Who owns it', text: 'Owner: ' },
  { label: 'When to retire it', text: 'Safe to retire after ' },
]

const THREAD_LINE = 'var(--color-border-emphasized)'
const AVATAR_PX = 32

function timeAgo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 48) return 'Yesterday'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** ⌘/Ctrl + Enter submits the surrounding form; Escape runs `onEscape`. */
function submitShortcuts(onEscape?: () => void) {
  return (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      event.currentTarget.requestSubmit()
    } else if (event.key === 'Escape' && onEscape) {
      // Keep page-level Escape handlers out of it.
      event.preventDefault()
      event.stopPropagation()
      onEscape()
    }
  }
}

function SmileIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.5 9.5c.6.9 1.5 1.4 2.5 1.4s1.9-.5 2.5-1.4" />
      <path d="M6 6.4h.01M10 6.4h.01" strokeWidth={1.8} />
    </svg>
  )
}

/** Speech bubbles, for the empty state. */
function ConversationMark() {
  return (
    <svg width={56} height={48} viewBox="0 0 56 48" fill="none" aria-hidden>
      <path
        d="M6 8a6 6 0 0 1 6-6h22a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H18l-7 6v-6.4A6 6 0 0 1 6 20V8Z"
        fill="var(--color-background-muted)"
        stroke="var(--color-border-emphasized)"
        strokeWidth={1.5}
      />
      <path
        d="M22 22a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6v6l-7-6h-9a6 6 0 0 1-6-6V22Z"
        fill="var(--color-background-surface)"
        stroke="var(--color-text-primary)"
        strokeWidth={1.5}
      />
      <path
        d="M30 27h12M30 32h7"
        stroke="var(--color-text-secondary)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  )
}

function ReactionChips({
  reactions,
  onToggle,
}: {
  reactions: Record<string, string[]>
  onToggle: (emoji: string) => void
}) {
  const viewer = useContext(ViewerContext)
  const used = REACTIONS.filter((r) => (reactions[r.emoji]?.length ?? 0) > 0)
  if (used.length === 0) return null
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      {used.map((r) => {
        const people = reactions[r.emoji] ?? []
        const mine = people.includes(viewer.id)
        return (
          <ToggleButton
            key={r.emoji}
            size="sm"
            label={`${r.name}, ${people.length}${mine ? ', including you' : ''}`}
            tooltip={mine ? 'Remove your reaction' : `React with ${r.name.toLowerCase()}`}
            isPressed={mine}
            onPressedChange={() => onToggle(r.emoji)}
          >
            {`${r.emoji} ${people.length}`}
          </ToggleButton>
        )
      })}
    </HStack>
  )
}

function AddReactionMenu({
  reactions,
  onToggle,
  onOpenChange,
}: {
  reactions: Record<string, string[]>
  onToggle: (emoji: string) => void
  onOpenChange: (isOpen: boolean) => void
}) {
  const viewer = useContext(ViewerContext)
  return (
    <DropdownMenu
      hasChevron={false}
      presentation="popover"
      placement="below"
      alignment="end"
      menuWidth={180}
      onOpenChange={onOpenChange}
      renderTrigger={(triggerProps) => (
        <IconButton
          {...triggerProps}
          variant="ghost"
          size="sm"
          label="Add reaction"
          tooltip="Add reaction"
          icon={<SmileIcon />}
        />
      )}
      items={REACTIONS.map((r) => ({
        id: r.emoji,
        label: `${r.emoji}  ${r.name}`,
        endContent: reactions[r.emoji]?.includes(viewer.id) ? (
          <Text type="supporting" color="secondary">
            Added
          </Text>
        ) : undefined,
        onClick: () => onToggle(r.emoji),
      }))}
    />
  )
}

/** True on devices with a real hover (mouse/trackpad); checked after mount. */
function useCanHover() {
  const [canHover, setCanHover] = useState(true)
  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover)').matches)
  }, [])
  return canHover
}

function CommentItem({
  comment,
  hasThreadLine,
  isNew,
  onEdit,
  onDelete,
  onToggleReaction,
}: {
  comment: ThreadComment
  /** Arrived after the thread first showed: eases in instead of popping. */
  isNew: boolean
  /** Draw the line down to the next comment's avatar. */
  hasThreadLine: boolean
  onEdit: (body: string) => void
  onDelete: () => void
  onToggleReaction: (emoji: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  // Actions show on hover or keyboard focus (always on touch screens), and
  // stay while one of their menus is open.
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocusWithin, setHasFocusWithin] = useState(false)
  const [openMenus, setOpenMenus] = useState(0)
  const canHover = useCanHover()
  const trackMenu = (isOpen: boolean) => setOpenMenus((n) => Math.max(0, n + (isOpen ? 1 : -1)))
  const showActions = !canHover || isHovered || hasFocusWithin || openMenus > 0
  const viewer = useContext(ViewerContext)
  const isMine = comment.authorId === viewer.id
  const tooLong = draft.trim().length > COMMENT_MAX_LENGTH
  const isPending = comment.isPending === true
  const articleRef = useEnterAnimation<HTMLElement>(isNew)
  const hasReactions = Object.values(comment.reactions ?? {}).some((people) => people.length > 0)

  const cancel = () => {
    setDraft(comment.body)
    setIsEditing(false)
  }
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || tooLong) return
    // Close at once; a failure shows above the thread and the comment keeps its old text.
    setIsEditing(false)
    onEdit(draft)
  }

  return (
    <HStack
      as="article"
      ref={articleRef as never}
      gap={3}
      vAlign="stretch"
      width="100%"
      aria-label={`Comment by ${comment.authorName}`}
      aria-busy={isPending || undefined}
      style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 160ms ease' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHasFocusWithin(false)
        }
      }}
    >
      {/* Avatar + thread line */}
      <VStack gap={0} hAlign="center" style={{ width: AVATAR_PX, flexShrink: 0 }}>
        <Avatar src={comment.authorAvatarUrl} name={comment.authorName} size={AVATAR_PX} tooltip={false} />
        {hasThreadLine ? (
          <span
            aria-hidden
            style={{
              display: 'block',
              flex: 1,
              width: 2,
              marginBlock: 'var(--spacing-1)',
              borderRadius: 'var(--radius-full)',
              background: THREAD_LINE,
            }}
          />
        ) : null}
      </VStack>

      {/* Flat: name and time beside the avatar, the text right under it. */}
      <VStack
        gap={1}
        hAlign="stretch"
        paddingBlockEnd={hasThreadLine ? 4 : 0}
        style={{ flex: 1, minWidth: 0 }}
      >
        <HStack gap={2} hAlign="between" vAlign="center" width="100%" style={{ minHeight: AVATAR_PX }}>
          <HStack gap={2} vAlign="center" wrap="wrap" style={{ minWidth: 0 }}>
            <Text weight="semibold">{comment.authorName}</Text>
            <Text type="supporting" color="secondary">
              {isMine ? 'You · ' : ''}
              {isPending ? (
                'Posting…'
              ) : (
                <time dateTime={comment.at} title={exactTime(comment.at)}>
                  {timeAgo(comment.at)}
                </time>
              )}
              {comment.editedAt ? (
                <span title={`Edited ${exactTime(comment.editedAt)}`}> · edited</span>
              ) : null}
            </Text>
          </HStack>
          {!isEditing && !isPending ? (
            <HStack
              gap={0.5}
              vAlign="center"
              style={{
                opacity: showActions ? 1 : 0,
                transition: 'opacity 120ms ease',
              }}
            >
              <AddReactionMenu
                reactions={comment.reactions ?? {}}
                onToggle={onToggleReaction}
                onOpenChange={trackMenu}
              />
              {isMine ? (
                <DropdownMenu
                  hasChevron={false}
                  presentation="popover"
                  placement="below"
                  alignment="end"
                  menuWidth={160}
                  onOpenChange={trackMenu}
                  renderTrigger={(triggerProps) => (
                    <IconButton
                      {...triggerProps}
                      variant="ghost"
                      size="sm"
                      label="Comment actions"
                      tooltip="Comment actions"
                      icon={<MoreHorizontalIcon size={14} />}
                    />
                  )}
                  items={[
                    {
                      id: 'edit',
                      label: 'Edit',
                      onClick: () => {
                        setDraft(comment.body)
                        setIsEditing(true)
                      },
                    },
                    { id: 'delete', label: 'Delete', variant: 'destructive', onClick: onDelete },
                  ]}
                />
              ) : null}
            </HStack>
          ) : null}
        </HStack>

        {isEditing ? (
          <VStack
            as="form"
            gap={2}
            hAlign="stretch"
            width="100%"
            onSubmit={save}
            onKeyDown={submitShortcuts(cancel)}
          >
            <TextArea
              label="Edit comment"
              isLabelHidden
              value={draft}
              onChange={setDraft}
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              hasAutoFocus
            />
            <HStack gap={2} hAlign="end" vAlign="center" width="100%">
              <Text type="supporting" color="secondary">
                Esc to cancel
              </Text>
              <Button variant="ghost" size="sm" label="Cancel" onClick={cancel} />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                label="Save"
                isDisabled={!draft.trim() || tooLong}
              />
            </HStack>
          </VStack>
        ) : (
          <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
            {comment.body}
          </Text>
        )}

        {/* Only take up room when someone has reacted. */}
        {!isEditing && hasReactions ? (
          <VStack hAlign="start" paddingBlockStart={1}>
            <ReactionChips reactions={comment.reactions ?? {}} onToggle={onToggleReaction} />
          </VStack>
        ) : null}
      </VStack>
    </HStack>
  )
}

/** Fades and lifts an element in once, on mount, when `enabled`. Skipped for reduced motion. */
function useEnterAnimation<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!enabled || !element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )
    // Only the first render of a comment animates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}

/** The thread's shape while it loads, so it never flashes as an empty conversation. */
function ThreadSkeleton() {
  return (
    <VStack gap={6} hAlign="stretch" width="100%" aria-busy="true" aria-label="Loading comments">
      {[0, 1].map((index) => (
        <HStack key={index} gap={3} vAlign="start" width="100%">
          <Skeleton index={index * 3} width={AVATAR_PX} height={AVATAR_PX} radius="rounded" />
          <VStack gap={2} hAlign="stretch" style={{ flex: 1 }}>
            <Skeleton index={index * 3 + 1} width={160} height={14} />
            <Skeleton index={index * 3 + 2} width="70%" height={14} />
          </VStack>
        </HStack>
      ))}
    </VStack>
  )
}

/**
 * Team notes on a link — why it exists, where it's shared, when it can go.
 * A conversation thread (oldest first) with the composer at the end.
 */
export default function LinkComments({
  viewer,
  comments,
  isLoading = false,
  loadError,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
  onToggleReaction,
}: LinkCommentsProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<LinkComment | null>(null)
  /** Runs a thread action, showing its failure above the thread. */
  const run = (action: Promise<unknown>) => {
    setThreadError(null)
    action.catch((e: unknown) => setThreadError(e instanceof Error ? e.message : 'Something went wrong.'))
  }
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const tooLong = draft.trim().length > COMMENT_MAX_LENGTH

  // Comments present when the thread first showed don't animate; later ones ease in.
  const seenIds = useRef<Set<string> | null>(null)
  if (seenIds.current === null && !isLoading) seenIds.current = new Set(comments.map((c) => c.id))
  const isNew = (id: string) => seenIds.current != null && !seenIds.current.has(id)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || tooLong) return
    // The comment shows in the thread at once; the draft comes back if posting fails.
    setDraft('')
    setError(null)
    onAdd(text).catch((e: unknown) => {
      setDraft((current) => current || text)
      setError(e instanceof Error ? e.message : 'Could not post the comment.')
    })
  }

  const applyPrompt = (text: string) => {
    setDraft(text)
    // After React commits the new value, put the caret at the end.
    requestAnimationFrame(() => {
      const el = composerRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  return (
    <ViewerContext.Provider value={viewer}>
    <VStack gap={8} hAlign="stretch" width="100%" style={{ maxWidth: 760 }}>
      {threadError ? <Banner status="error" title={threadError} /> : null}
      {loadError && comments.length === 0 ? (
        <Banner
          status="error"
          title="The discussion could not be loaded."
          endContent={onRetry ? <Button variant="secondary" size="sm" label="Try again" onClick={onRetry} /> : undefined}
        />
      ) : isLoading ? (
        <ThreadSkeleton />
      ) : comments.length === 0 ? (
        <VStack gap={3} hAlign="start" width="100%" paddingBlock={4}>
          <ConversationMark />
          <VStack gap={1} hAlign="start">
            <Text weight="semibold" style={{ fontSize: 17 }}>
              Start the conversation
            </Text>
            <Text type="supporting" color="secondary" style={{ maxWidth: 460 }}>
              Leave context for your team: why this link exists, where it is shared, and when it
              can be retired. Comments never affect where the link goes.
            </Text>
          </VStack>
        </VStack>
      ) : (
        <VStack gap={5} hAlign="stretch" width="100%">
          <VStack gap={0.5} hAlign="start">
            <Text weight="semibold">Discussion</Text>
            <Text type="supporting" color="secondary">
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
          </VStack>

          <VStack gap={0} hAlign="stretch" width="100%">
            {comments.map((comment, index) => (
              <CommentItem
                key={comment.clientKey ?? comment.id}
                comment={comment}
                isNew={isNew(comment.clientKey ?? comment.id)}
                hasThreadLine={index < comments.length - 1}
                onEdit={(body) => run(onEdit(comment.id, body.trim()))}
                onDelete={() => setDeleting(comment)}
                onToggleReaction={(emoji) => run(onToggleReaction(comment.id, emoji))}
              />
            ))}
          </VStack>
        </VStack>
      )}

      {/* Composer */}
      <HStack gap={3} vAlign="start" width="100%">
        <Avatar src={viewer.avatarUrl} name={viewer.name} size={AVATAR_PX} tooltip={false} />
        <VStack
          as="form"
          gap={3}
          hAlign="stretch"
          style={{ flex: 1, minWidth: 0 }}
          onSubmit={(event) => void submit(event)}
          onKeyDown={submitShortcuts()}
        >
          <TextArea
            ref={composerRef}
            label="Add a comment"
            isLabelHidden
            placeholder={comments.length === 0 ? 'Write the first comment…' : 'Reply to the thread…'}
            value={draft}
            onChange={(value) => {
              setDraft(value)
              if (error) setError(null)
            }}
            rows={3}
            maxLength={draft.length > COMMENT_MAX_LENGTH * 0.8 ? COMMENT_MAX_LENGTH : undefined}
            status={
              error
                ? { type: 'error', message: error }
                : tooLong
                  ? { type: 'error', message: `Keep it under ${COMMENT_MAX_LENGTH.toLocaleString()} characters.` }
                  : undefined
            }
          />
          <HStack gap={3} hAlign="between" vAlign="center" width="100%" wrap="wrap">
            {draft.trim() ? (
              <Text type="supporting" color="secondary">
                Only you can edit or delete your comments.
              </Text>
            ) : (
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="supporting" color="secondary">
                  Start with
                </Text>
                {PROMPTS.map((prompt) => (
                  <Button
                    key={prompt.label}
                    variant="secondary"
                    size="sm"
                    label={prompt.label}
                    onClick={() => applyPrompt(prompt.text)}
                  />
                ))}
              </HStack>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              label="Comment"
              aria-keyshortcuts="Meta+Enter Control+Enter"
              endContent={<InlineShortcut />}
              isDisabled={!draft.trim() || tooLong}
            />
          </HStack>
        </VStack>
      </HStack>

      <AlertDialog
        isOpen={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete comment?"
        description="It is removed for everyone, along with its reactions. This cannot be undone."
        actionLabel="Delete"
        actionVariant="destructive"
        onAction={() => {
          if (deleting) run(onDelete(deleting.id))
          setDeleting(null)
        }}
      />
    </VStack>
    </ViewerContext.Provider>
  )
}
