'use client'

import { useState, useRef, useEffect } from 'react'
import { Message, isMessageDeleted } from '@/hooks/useChat'
import { DELETED_MESSAGE_PLACEHOLDER } from '@/lib/chat/constants'
import { Reply, Pencil, Trash2, Check, X, SmilePlus, FileText } from 'lucide-react'

const ALL_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

interface MessageBubbleProps {
  message: Message
  isMe: boolean
  currentUserId: string
  onReact: (messageId: string, emoji: string) => void
  onReply: (message: Message) => void
  onEdit: (messageId: string, newContent: string) => void
  onDelete: (messageId: string) => void
  showAvatar?: boolean
}

function MessageAttachments({
  attachmentUrl,
  attachmentType,
}: {
  attachmentUrl: string
  attachmentType: string | null
}) {
  const type = attachmentType || 'file'

  if (type === 'image') {
    return (
      <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={attachmentUrl}
          alt="Shared attachment"
          className="max-w-full rounded-lg max-h-64 object-cover"
        />
      </a>
    )
  }

  if (type === 'video') {
    return (
      <video
        src={attachmentUrl}
        controls
        className="mt-2 max-w-full rounded-lg max-h-64"
        preload="metadata"
      />
    )
  }

  return (
    <a
      href={attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 text-xs underline opacity-90"
    >
      <FileText className="w-3.5 h-3.5" />
      View attachment
    </a>
  )
}

export default function MessageBubble({
  message, isMe, currentUserId, onReact, onReply, onEdit, onDelete, showAvatar = true,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null)
  const [showSeenBy, setShowSeenBy] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const pickerRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const deleted = isMessageDeleted(message)
  const hasAttachment = !deleted && Boolean(message.attachment_url)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setShowEmojiPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isEditing) editRef.current?.focus()
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) setEditContent(message.content)
  }, [message.content, isEditing])

  const reactions = Object.values(message.reactions)
  const readsExcludingMe = message.reads.filter(r => r.user_id !== currentUserId)
  const seenCount = readsExcludingMe.length

  const toUTC = (dateStr: string) => {
    if (!dateStr) return new Date()
    return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  }

  const formatTime = (dateStr: string) =>
    toUTC(dateStr).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
    })

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content)
      onEdit(message.id, editContent)
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const replyPreviewText =
    message.reply_to && isMessageDeleted(message.reply_to)
      ? DELETED_MESSAGE_PLACEHOLDER
      : message.reply_to?.content

  return (
    <div className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>

      {showAvatar && (
        <div className="w-8 h-8 rounded-full bg-slate-500 dark:bg-slate-600 flex items-center justify-center shrink-0 text-xs font-bold text-white mb-1 overflow-hidden border border-slate-400/30 shadow-sm">
          {message.profiles?.avatar_url
            ? <img src={message.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            : message.profiles?.full_name?.charAt(0).toUpperCase() || '?'
          }
        </div>
      )}

      <div className={`flex flex-col max-w-[78%] sm:max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>

        {!isMe && showAvatar && (
          <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1 px-1 font-semibold">
            {message.profiles?.full_name || 'Unknown'}
          </p>
        )}

        {message.reply_to && (
          <div className={`
            mb-1.5 px-3 py-2 rounded-xl border-l-2 border-accent
            bg-card/80 backdrop-blur text-xs max-w-full shadow-sm
            ${isMe ? 'self-end' : 'self-start'}
          `}>
            <p className="font-bold text-accent text-[11px] mb-0.5">
              ↩ {message.reply_to.profiles?.full_name || 'Unknown'}
            </p>
            <p className="text-muted-foreground dark:text-gray-400 truncate max-w-[200px] italic">
              {replyPreviewText}
            </p>
          </div>
        )}

        <div className={`relative flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

          {!deleted && (
            <div className={`
              flex items-center gap-0.5 mb-1.5
              opacity-100 md:opacity-0 md:group-hover:opacity-100
              transition-all duration-150
              ${isMe ? 'flex-row-reverse' : 'flex-row'}
            `}>
              <button
                onClick={() => onReply(message)}
                className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 active:scale-95 transition-all"
                title="Reply"
              >
                <Reply className="w-3 h-3 text-muted-foreground dark:text-gray-300" />
              </button>

              {isMe && (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setEditContent(message.content) }}
                    className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 active:scale-95 transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground dark:text-gray-300" />
                  </button>

                  <button
                    onClick={() => onDelete(message.id)}
                    className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 active:scale-95 transition-all group/delete"
                    title="Delete for everyone"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground dark:text-gray-300 group-hover/delete:text-red-500 transition-colors" />
                  </button>
                </>
              )}

              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowEmojiPicker(v => !v)}
                  className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 active:scale-95 transition-all"
                  title="React"
                >
                  <SmilePlus className="w-3 h-3 text-muted-foreground dark:text-gray-300" />
                </button>

                {showEmojiPicker && (
                  <div className={`
                    absolute bottom-9 z-50 bg-card border border-border
                    rounded-2xl shadow-2xl p-2 flex gap-0.5
                    ${isMe ? 'right-0' : 'left-0'}
                  `}>
                    {ALL_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false) }}
                        className={`
                          text-lg p-1.5 rounded-xl transition-all
                          hover:scale-125 active:scale-95
                          ${message.reactions[emoji]?.reactedByMe ? 'bg-accent/15 ring-1 ring-accent' : 'hover:bg-secondary'}
                        `}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`
            px-3.5 py-2.5 rounded-2xl text-sm shadow-sm
            ${deleted
              ? 'bg-gray-200 dark:bg-neutral-700 border border-border text-gray-600 dark:text-gray-200 italic rounded-2xl'
              : isMe
                ? 'bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-200 rounded-br-md'
                : 'bg-card border border-border text-foreground rounded-bl-md'
            }
          `}>
            {deleted ? (
              <p className="text-sm italic opacity-90 text-gray-600 dark:text-gray-200">{DELETED_MESSAGE_PLACEHOLDER}</p>
            ) : isEditing ? (
              <div className="flex items-center gap-2 min-w-[180px]">
                <input
                  ref={editRef}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave()
                    if (e.key === 'Escape') handleEditCancel()
                  }}
                  className="flex-1 bg-transparent border-b border-gray-500/40 outline-none text-sm pb-0.5 text-gray-600 dark:text-gray-200 placeholder:text-gray-500/50"
                />
                <button onClick={handleEditSave} className="shrink-0 hover:scale-110 transition-transform">
                  <Check className="w-3.5 h-3.5 text-gray-600 dark:text-gray-200" />
                </button>
                <button onClick={handleEditCancel} className="shrink-0 hover:scale-110 transition-transform">
                  <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-200" />
                </button>
              </div>
            ) : (
              <>
                {message.content ? (
                  <p className="break-words leading-relaxed">{message.content}</p>
                ) : null}
                {hasAttachment && message.attachment_url && (
                  <MessageAttachments
                    attachmentUrl={message.attachment_url}
                    attachmentType={message.attachment_type}
                  />
                )}
              </>
            )}

            <div className={`flex items-center gap-1.5 mt-1 ${isMe && !deleted ? 'justify-end' : 'justify-start'}`}>
              {!deleted && message.is_edited && (
                <span className={`text-[10px] italic ${isMe ? 'text-gray-600 dark:text-gray-200' : 'text-muted-foreground dark:text-gray-400'}`}>
                  edited
                </span>
              )}
              <p className={`text-[11px] ${deleted ? 'text-gray-500 dark:text-gray-400' : isMe ? 'text-gray-600 dark:text-gray-200' : 'text-muted-foreground dark:text-gray-400'}`}>
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        </div>

        {!deleted && reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(reaction => (
              <div
                key={reaction.emoji}
                className="relative"
                onMouseEnter={() => setHoveredReaction(reaction.emoji)}
                onMouseLeave={() => setHoveredReaction(null)}
              >
                <button
                  onClick={() => onReact(message.id, reaction.emoji)}
                  className={`
                    flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs
                    transition-all hover:scale-105 active:scale-95 shadow-sm
                    ${reaction.reactedByMe
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-card border-border text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-semibold">{reaction.count}</span>
                </button>

                {hoveredReaction === reaction.emoji && reaction.users.length > 0 && (
                  <div className={`
                    absolute bottom-9 z-50 bg-card border border-border
                    rounded-xl shadow-2xl p-3 w-36
                    ${isMe ? 'right-0' : 'left-0'}
                  `}>
                    <p className="text-xs font-bold text-foreground mb-2">
                      {reaction.emoji} Reacted
                    </p>
                    <div className="space-y-1.5">
                      {reaction.users.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-500 dark:bg-slate-600 border border-slate-400/30 flex items-center justify-center text-xs text-white font-bold overflow-hidden shrink-0">
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              : u.full_name?.charAt(0).toUpperCase()
                            }
                          </div>
                          <span className="text-xs text-foreground truncate">
                            {u.id === currentUserId ? 'You' : u.full_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isMe && !deleted && seenCount > 0 && (
          <div
            className="relative flex items-center gap-1 mt-1 px-1 cursor-pointer"
            onMouseEnter={() => setShowSeenBy(true)}
            onMouseLeave={() => setShowSeenBy(false)}
          >
            <div className="flex -space-x-1.5">
              {readsExcludingMe.slice(0, 3).map((read, i) => (
                <div
                  key={read.user_id}
                  style={{ zIndex: 3 - i }}
                  className="w-4 h-4 rounded-full bg-slate-500 dark:bg-slate-600 border-2 border-background flex items-center justify-center overflow-hidden"
                >
                  {read.profiles?.avatar_url
                    ? <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[7px] font-bold text-white">
                        {read.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                  }
                </div>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {seenCount > 1 ? `Seen by ${seenCount}` : 'Seen'}
            </span>

            {showSeenBy && (
              <div className="absolute bottom-7 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl p-3 w-48">
                <p className="text-xs font-bold text-foreground mb-2.5">👁️ Seen by</p>
                <div className="space-y-2">
                  {readsExcludingMe.map(read => (
                    <div key={read.user_id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-500 dark:bg-slate-600 flex items-center justify-center overflow-hidden shrink-0 border border-slate-400/30">
                        {read.profiles?.avatar_url
                          ? <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-white">
                              {read.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        }
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[110px]">
                          {read.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-muted-foreground dark:text-gray-400">
                          {formatTime(read.seen_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}