'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ChatBubble from './ChatBubble'
import MediaUploader from './MediaUploader'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  chat_id: string
  sender_id: string
  message_type: 'text' | 'image' | 'audio'
  content: string | null
  media_path: string | null
  metadata: any
  status: 'sent' | 'deleted' | 'expired'
  view_mode: 'once' | 'twice' | 'fulltime'
  view_count: number
  created_at: string
  sender?: {
    full_name: string
    avatar_url: string | null
  }
}

interface RichMediaChatProps {
  chatId: string
  currentUserId: string
}

export default function RichMediaChat({ chatId, currentUserId }: RichMediaChatProps) {
  const [messageText, setMessageText] = useState('')
  const [showMediaUploader, setShowMediaUploader] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch initial messages
  const [initialMessages, setInitialMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!chatId) return

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[RichMediaChat] Failed to fetch messages:', error)
        return
      }

      setInitialMessages(data || [])
    }

    fetchMessages()
  }, [chatId])

  // Real-time message sync
  const { messages, isConnected, addLocalMessage } = useRealtimeMessages({
    chatId,
    initialMessages,
    currentUserId,
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return

    setIsSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          message_type: 'text',
          content: messageText.trim(),
          status: 'sent',
          view_mode: 'fulltime',
          view_count: 0,
        })
        .select()
        .single()

      if (error) throw error

      setMessageText('')
    } catch (error) {
      console.error('[RichMediaChat] Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleMediaSent = (messageData: Message) => {
    addLocalMessage(messageData)
    setShowMediaUploader(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Connection status indicator */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        <Button size="icon" variant="ghost" className="w-8 h-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              isOwnMessage={message.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border bg-background">
        {showMediaUploader ? (
          <MediaUploader
            chatId={chatId}
            currentUserId={currentUserId}
            onMediaSent={handleMediaSent}
            onCancel={() => setShowMediaUploader(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowMediaUploader(true)}
              className="w-10 h-10 rounded-full"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <Input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="flex-1 h-11 bg-secondary/50 border-border text-foreground rounded-full"
            />

            <Button
              type="button"
              size="icon"
              onClick={handleSendMessage}
              disabled={!messageText.trim() || isSending}
              className="w-11 h-11 rounded-full bg-accent hover:bg-accent/90"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
