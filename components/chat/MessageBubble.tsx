'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/hooks/useChat'

const ALL_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

interface MessageBubbleProps {
  message: Message
  isMe: boolean
  currentUserId: string
  onReact: (messageId: string, emoji: string) => void
  showAvatar?: boolean
}

export default function MessageBubble({
  message, isMe, currentUserId, onReact, showAvatar = true,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null)
  const [showSeenBy, setShowSeenBy] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const reactions = Object.values(message.reactions)
  const readsExcludingMe = message.reads.filter(r => r.user_id !== currentUserId)
  const seenCount = readsExcludingMe.length

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

        {/* Bubble + emoji trigger */}
        <div className={`relative flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

          {/* Emoji picker trigger */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-xs mb-1 hover:bg-accent/20 shrink-0"
            >
              😊
            </button>

            {showEmojiPicker && (
              <div className={`absolute bottom-8 z-50 bg-background border border-border rounded-2xl shadow-xl p-2 flex gap-1 ${isMe ? 'right-0' : 'left-0'}`}>
                {ALL_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false) }}
                    className={`text-lg sm:text-xl p-1.5 rounded-xl transition-all hover:scale-125 hover:bg-secondary active:scale-95 ${
                      message.reactions[emoji]?.reactedByMe ? 'bg-accent/20 ring-1 ring-accent' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message bubble */}
          <div className={`px-3 sm:px-4 py-2 rounded-2xl text-sm ${
            isMe
              ? 'bg-accent text-accent-foreground rounded-br-sm'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
          }`}>
            <p className="wrap-break-word leading-relaxed">{message.content}</p>
            <p className={`text-xs mt-1 ${isMe ? 'text-accent-foreground/60' : 'text-muted-foreground'}`}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Reactions row */}
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all hover:scale-105 active:scale-95 ${
                    reaction.reactedByMe
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-background border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-medium">{reaction.count}</span>
                </button>

                {/* Who reacted tooltip */}
                {hoveredReaction === reaction.emoji && reaction.users.length > 0 && (
                  <div className={`absolute bottom-8 z-50 bg-background border border-border rounded-xl shadow-xl p-2.5 min-w-35 ${isMe ? 'right-0' : 'left-0'}`}>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      {reaction.emoji} Reacted
                    </p>
                    <div className="space-y-1.5">
                      {reaction.users.map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-xs text-accent-foreground font-bold overflow-hidden shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : u.full_name?.charAt(0).toUpperCase()}
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
                  {read.profiles?.avatar_url ? (
                    <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-accent-foreground">
                      {read.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {seenCount > 1 ? `Seen by ${seenCount}` : 'Seen'}
            </span>

            {/* Seen by modal */}
            {showSeenBy && (
              <div className="absolute bottom-6 right-0 z-50 bg-background border border-border rounded-xl shadow-xl p-3 min-w-40">
                <p className="text-xs font-semibold text-foreground mb-2">👁️ Seen by</p>
                <div className="space-y-2">
                  {readsExcludingMe.map(read => (
                    <div key={read.user_id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
                        {read.profiles?.avatar_url ? (
                          <img src={read.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-accent-foreground">
                            {read.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-27.5">
                          {read.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(read.seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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