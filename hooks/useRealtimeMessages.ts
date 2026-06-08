'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type MessageStatus = 'sent' | 'deleted' | 'expired'
type ViewMode = 'once' | 'twice' | 'fulltime'
type MessageType = 'text' | 'image' | 'audio'

interface Message {
  id: string
  chat_id: string
  sender_id: string
  message_type: MessageType
  content: string | null
  media_path: string | null
  metadata: any
  status: MessageStatus
  view_mode: ViewMode
  view_count: number
  created_at: string
  sender?: {
    full_name: string
    avatar_url: string | null
  }
}

interface UseRealtimeMessagesOptions {
  chatId: string
  initialMessages?: Message[]
  currentUserId: string
}

export function useRealtimeMessages({
  chatId,
  initialMessages = [],
  currentUserId,
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<any>(null)

  // Reset messages state when switching rooms / initialMessages update
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, chatId])

  useEffect(() => {
    if (!chatId) return

    // Create Supabase realtime channel
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Realtime] New message inserted:', payload)
          const newMessage = payload.new as Message
          
          // Avoid inserting duplicate local messages
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) return prev
            
            // Fetch sender info for the new message
            fetchSenderInfo(newMessage).then((messageWithSender) => {
              setMessages((current) => {
                if (current.some((msg) => msg.id === messageWithSender.id)) {
                  // If it was somehow added in the meantime, update it
                  return current.map((msg) =>
                    msg.id === messageWithSender.id ? messageWithSender : msg
                  )
                }
                return [...current, messageWithSender]
              })
            })
            
            return prev
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Realtime] Message updated:', payload)
          const updatedMessage = payload.new as Message
          
          // Handle status changes (deleted, expired) and view_count updates
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === updatedMessage.id) {
                // IMPORTANT: Preserve the sender profile information which is not included in the payload
                return {
                  ...msg,
                  ...updatedMessage,
                  sender: msg.sender
                }
              }
              return msg
            })
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Realtime] Message deleted:', payload)
          const deletedId = payload.old.id
          setMessages((prev) => prev.filter((msg) => msg.id !== deletedId))
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        console.log('[Realtime] Channel cleaned up')
      }
    }
  }, [chatId])

  const fetchSenderInfo = async (message: Message): Promise<Message> => {
    try {
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', message.sender_id)
        .single()

      if (sender) {
        return { ...message, sender }
      }
    } catch (error) {
      console.error('[Realtime] Failed to fetch sender info:', error)
    }
    return message
  }

  const addLocalMessage = (message: Message) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg.id === message.id)) return prev
      return [...prev, message]
    })
  }

  const updateLocalMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    )
  }

  const removeLocalMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }

  return {
    messages,
    isConnected,
    addLocalMessage,
    updateLocalMessage,
    removeLocalMessage,
  }
}
