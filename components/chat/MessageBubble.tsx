'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/hooks/useChat'
import { Reply, Pencil, Check, X, SmilePlus } from 'lucide-react'

const ALL_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
const TZ = 'Africa/Nairobi'

interface MessageBubbleProps {
  message: Message
  isMe: boolean
  currentUserId: string
  onReact: (messageId: string, emoji: string) => void
  onReply: (message: Message) => void
  onEdit: (messageId: string, newContent: string) => void
  showAvatar?: boolean
}

export default function MessageBubble({
  message, isMe, currentUserId, onReact, onReply, onEdit, showAvatar = true,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null)
  const [showSeenBy, setShowSeenBy] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const pickerRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

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

  const reactions = Object.values(message.reactions)
  const readsExcludingMe = message.reads.filter(r => r.user_id !== currentUserId)
  const seenCount = readsExcludingMe.length

  /// ✅ Force UTC parsing — append 'Z' if missing so JS treats it as UTC
const toUTC = (dateStr: string) => {
  if (!dateStr) return new Date()
  // Supabase returns "2024-01-15T10:30:00" without Z — force UTC
  return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
}

const formatTime = (dateStr: string) =>
  toUTC(dateStr).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi',
  })

const formatDate = (dateStr: string) =>
  toUTC(dateStr).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi',
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

  return (
    <div className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>

      {/* Avatar */}
      {showAvatar && (
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-xs font-bold text-accent mb-1 overflow-hidden border border-accent/20">
          {message.profiles?.avatar_url
            ? <img src={message.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            : message.profiles?.full_name?.charAt(0).toUpperCase() || '?'
          }
        </div>
      )}

      <div className={`flex flex-col max-w-[78%] sm:max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>

        {/* Sender name */}
        {!isMe && showAvatar && (
          <p className="text-xs text-muted-foreground mb-1 px-1 font-semibold">
            {message.profiles?.full_name || 'Unknown'}
          </p>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={`
            mb-1.5 px-3 py-2 rounded-xl border-l-2 border-accent
            bg-card/80 backdrop-blur text-xs max-w-full shadow-sm
            ${isMe ? 'self-end' : 'self-start'}
          `}>
            <p className="font-bold text-accent text-[11px] mb-0.5">
              ↩ {message.reply_to.profiles?.full_name || 'Unknown'}
            </p>
            <p className="text-muted-foreground truncate max-w-[200px]">
              {message.reply_to.content}
            </p>
          </div>
        )}

        {/* Bubble row */}
        <div className={`relative flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

          {/* Hover action buttons */}
          {/* Action buttons — always visible on mobile, hover on desktop */}
<div className={`
  flex items-center gap-0.5 mb-1.5
  opacity-100 md:opacity-0 md:group-hover:opacity-100
  transition-all duration-150
  ${isMe ? 'flex-row-reverse' : 'flex-row'}
`}>
  {/* Reply */}
  <button
    onClick={() => onReply(message)}
    className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 active:scale-95 transition-all"
    title="Reply"
  >
    <Reply className="w-3 h-3 text-muted-foreground" />
  </button>

  {/* Edit — own messages only */}
  {isMe && (
    <button
      onClick={() => { setIsEditing(true); setEditContent(message.content) }}
      className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 active:scale-95 transition-all"
      title="Edit"
    >
      <Pencil className="w-3 h-3 text-muted-foreground" />
    </button>
  )}

  {/* React */}
  <div className="relative" ref={pickerRef}>
    <button
      onClick={() => setShowEmojiPicker(v => !v)}
      className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 active:scale-95 transition-all"
      title="React"
    >
      <SmilePlus className="w-3 h-3 text-muted-foreground" />
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


          {/* Message bubble */}
          <div className={`
            px-3.5 py-2.5 rounded-2xl text-sm shadow-sm
            ${isMe
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-card border border-border text-foreground rounded-bl-md'
            }
          `}>
            {isEditing ? (
              <div className="flex items-center gap-2 min-w-[180px]">
                <input
                  ref={editRef}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave()
                    if (e.key === 'Escape') handleEditCancel()
                  }}
                  className="flex-1 bg-transparent border-b border-white/40 outline-none text-sm pb-0.5 text-white placeholder:text-white/50"
                />
                <button onClick={handleEditSave} className="shrink-0 hover:scale-110 transition-transform">
                  <Check className="w-3.5 h-3.5 text-white/80" />
                </button>
                <button onClick={handleEditCancel} className="shrink-0 hover:scale-110 transition-transform">
                  <X className="w-3.5 h-3.5 text-white/80" />
                </button>
              </div>
            ) : (
              <p className="break-words leading-relaxed">{message.content}</p>
            )}

            <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {message.is_edited && (
                <span className={`text-[10px] italic ${isMe ? 'text-white/40' : 'text-muted-foreground'}`}>
                  edited
                </span>
              )}
              {/* ✅ Timezone fixed — Africa/Nairobi UTC+3 */}
              <p className={`text-[11px] ${isMe ? 'text-white/50' : 'text-muted-foreground'}`}>
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
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
                          <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-xs text-accent font-bold overflow-hidden shrink-0">
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

        {/* Seen by */}
        {isMe && seenCount > 0 && (
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
                  className="w-4 h-4 rounded-full bg-accent border-2 border-background flex items-center justify-center overflow-hidden"
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
            <span className="text-[10px] text-muted-foreground">
              {seenCount > 1 ? `Seen by ${seenCount}` : 'Seen'}
            </span>

            {showSeenBy && (
              <div className="absolute bottom-7 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl p-3 w-48">
                <p className="text-xs font-bold text-foreground mb-2.5">👁️ Seen by</p>
                <div className="space-y-2">
                  {readsExcludingMe.map(read => (
                    <div key={read.user_id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden shrink-0 border border-accent/20">
                        {read.profiles?.avatar_url
                          ? <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-accent">
                              {read.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        }
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[110px]">
                          {read.profiles?.full_name || 'Unknown'}
                        </p>
                        {/* ✅ seen_at also in Africa/Nairobi */}
                        <p className="text-[10px] text-muted-foreground">
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