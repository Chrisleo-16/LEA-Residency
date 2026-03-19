'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/hooks/useChat'
import { Reply, Pencil, Check, X } from 'lucide-react'

const ALL_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

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
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
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

  // ✅ Format time using user's local timezone
  const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi', // ✅ UTC+3 — East Africa Time
  })
}

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent)
    }
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
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-accent-foreground mb-1 overflow-hidden">
          {message.profiles?.avatar_url ? (
            <img src={message.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            message.profiles?.full_name?.charAt(0).toUpperCase() || '?'
          )}
        </div>
      )}

      <div className={`flex flex-col max-w-[78%] sm:max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>

        {/* Sender name */}
        {!isMe && showAvatar && (
          <p className="text-xs text-muted-foreground mb-1 px-1 font-medium">
            {message.profiles?.full_name || 'Unknown'}
          </p>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={`
            mb-1 px-3 py-1.5 rounded-lg border-l-2 border-accent
            bg-secondary/60 text-xs max-w-full cursor-pointer
            ${isMe ? 'self-end' : 'self-start'}
          `}>
            <p className="font-semibold text-accent text-[11px] mb-0.5">
              {message.reply_to.profiles?.full_name || 'Unknown'}
            </p>
            <p className="text-muted-foreground truncate max-w-[200px]">
              {message.reply_to.content}
            </p>
          </div>
        )}

        {/* Bubble row */}
        <div className={`relative flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

          {/* Action buttons — visible on hover */}
          <div className={`
            opacity-0 group-hover:opacity-100 transition-opacity
            flex items-center gap-0.5 mb-1
            ${isMe ? 'flex-row-reverse' : 'flex-row'}
          `}>
            {/* Reply button */}
            <button
              onClick={() => onReply(message)}
              className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-accent/20 transition-colors"
              title="Reply"
            >
              <Reply className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* Edit button — only for own messages */}
            {isMe && (
              <button
                onClick={() => { setIsEditing(true); setEditContent(message.content) }}
                className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-accent/20 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
            )}

            {/* Emoji trigger */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowEmojiPicker(v => !v)}
                className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-xs hover:bg-accent/20 transition-colors"
                title="React"
              >
                😊
              </button>

              {showEmojiPicker && (
                <div className={`
                  absolute bottom-8 z-50 bg-background border border-border
                  rounded-2xl shadow-xl p-2 flex gap-1
                  ${isMe ? 'right-0' : 'left-0'}
                `}>
                  {ALL_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false) }}
                      className={`
                        text-lg sm:text-xl p-1.5 rounded-xl transition-all
                        hover:scale-125 hover:bg-secondary active:scale-95
                        ${message.reactions[emoji]?.reactedByMe ? 'bg-accent/20 ring-1 ring-accent' : ''}
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
            px-3 sm:px-4 py-2 rounded-2xl text-sm
            ${isMe
              ? 'bg-accent text-accent-foreground rounded-br-sm'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
            }
          `}>
            {/* Edit mode */}
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
                  className="flex-1 bg-transparent border-b border-accent-foreground/50 outline-none text-sm pb-0.5"
                />
                <button onClick={handleEditSave} className="shrink-0">
                  <Check className="w-3.5 h-3.5 text-accent-foreground/80 hover:text-accent-foreground" />
                </button>
                <button onClick={handleEditCancel} className="shrink-0">
                  <X className="w-3.5 h-3.5 text-accent-foreground/80 hover:text-accent-foreground" />
                </button>
              </div>
            ) : (
              <p className="break-words leading-relaxed">{message.content}</p>
            )}

            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {/* ✅ Edited label */}
              {message.is_edited && (
                <span className={`text-[10px] ${isMe ? 'text-accent-foreground/50' : 'text-muted-foreground'}`}>
                  edited
                </span>
              )}
              <p className={`text-xs ${isMe ? 'text-accent-foreground/60' : 'text-muted-foreground'}`}>
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                    transition-all hover:scale-105 active:scale-95
                    ${reaction.reactedByMe
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-background border-border text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-medium">{reaction.count}</span>
                </button>

                {hoveredReaction === reaction.emoji && reaction.users.length > 0 && (
                  <div className={`
                    absolute bottom-8 z-50 bg-background border border-border
                    rounded-xl shadow-xl p-2.5 w-36
                    ${isMe ? 'right-0' : 'left-0'}
                  `}>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      {reaction.emoji} Reacted
                    </p>
                    <div className="space-y-1.5">
                      {reaction.users.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-xs text-accent-foreground font-bold overflow-hidden shrink-0">
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
                  className="w-4 h-4 rounded-full bg-accent border border-background flex items-center justify-center overflow-hidden"
                >
                  {read.profiles?.avatar_url
                    ? <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[8px] font-bold text-accent-foreground">
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
              <div className="absolute bottom-6 right-0 z-50 bg-background border border-border rounded-xl shadow-xl p-3 w-44">
                <p className="text-xs font-semibold text-foreground mb-2">👁️ Seen by</p>
                <div className="space-y-2">
                  {readsExcludingMe.map(read => (
                    <div key={read.user_id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
                        {read.profiles?.avatar_url
                          ? <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-accent-foreground">
                              {read.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        }
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[110px]">
                          {read.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(read.seen_at).toLocaleTimeString([], { 
  hour: '2-digit', 
  minute: '2-digit',
  timeZone: 'Africa/Nairobi'
})}
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