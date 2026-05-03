'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
}

export interface Reaction {
  emoji: string
  count: number
  users: Profile[]
  reactedByMe: boolean
}

export interface MessageRead {
  user_id: string
  seen_at: string
  profiles?: Profile
}

export interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  conversation_id: string
  reply_to_id: string | null
  is_edited: boolean
  edited_at: string | null
  profiles?: Profile
  reply_to?: Message | null
  reactions: Record<string, Reaction>
  reads: MessageRead[]
}

export interface PresenceUser {
  userId: string
  fullName: string
  avatarUrl: string | null
  onlineAt: string
}

export function useChat(conversationId: string | null, currentUser: User | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)
  const currentUserRef = useRef(currentUser)

  useEffect(() => { currentUserRef.current = currentUser }, [currentUser])

  const buildReactionsMap = (rawReactions: any[], userId?: string) => {
    const reactionsMap: Record<string, Reaction> = {}
    rawReactions.forEach(r => {
      if (!reactionsMap[r.emoji]) {
        reactionsMap[r.emoji] = { emoji: r.emoji, count: 0, users: [], reactedByMe: false }
      }
      reactionsMap[r.emoji].count++
      if (r.profiles) reactionsMap[r.emoji].users.push(r.profiles)
      if (r.user_id === userId) reactionsMap[r.emoji].reactedByMe = true
    })
    return reactionsMap
  }

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    const { data: rawMessages } = await supabase
      .from('messages')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!rawMessages) return

    const messageIds = rawMessages.map(m => m.id)
    const replyToIds = rawMessages
      .filter(m => m.reply_to_id)
      .map(m => m.reply_to_id)

    const [{ data: rawReactions }, { data: rawReads }, { data: replyMessages }] =
      await Promise.all([
        supabase
          .from('message_reactions')
          .select('*, profiles(id, full_name, avatar_url)')
          .in('message_id', messageIds.length ? messageIds : ['00000000-0000-0000-0000-000000000000']),
        supabase
          .from('message_reads')
          .select('*, profiles(id, full_name, avatar_url)')
          .in('message_id', messageIds.length ? messageIds : ['00000000-0000-0000-0000-000000000000']),
        replyToIds.length
          ? supabase
              .from('messages')
              .select('*, profiles(id, full_name, avatar_url)')
              .in('id', replyToIds)
          : Promise.resolve({ data: [] }),
      ])

    const enriched: Message[] = rawMessages.map(msg => ({
      ...msg,
      reply_to: replyMessages?.find(r => r.id === msg.reply_to_id) || null,
      reactions: buildReactionsMap(
        (rawReactions || []).filter(r => r.message_id === msg.id),
        currentUser?.id
      ),
      reads: (rawReads || []).filter(r => r.message_id === msg.id),
    }))

    setMessages(enriched)
    setIsLoading(false)
  }, [conversationId, currentUser?.id])

  const markAsSeen = useCallback(async (messageIds: string[]) => {
    if (!currentUser || !messageIds.length) return
    await supabase
      .from('message_reads')
      .upsert(
        messageIds.map(id => ({ message_id: id, user_id: currentUser.id })),
        { onConflict: 'message_id,user_id', ignoreDuplicates: true }
      )
  }, [currentUser])

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!content.trim() || !conversationId || !currentUser) return

    if (presenceChannelRef.current && isTypingRef.current) {
      presenceChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: false },
      })
      isTypingRef.current = false
    }

    const { data: newMsg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: content.trim(),
        reply_to_id: replyToId || null,
      })
      .select('*, profiles(id, full_name, avatar_url)')
      .single()

    if (error) { console.error('Send error:', error.message); return }

    // Fetch reply_to if exists
    let replyTo = null
    if (replyToId) {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('id', replyToId)
        .single()
      replyTo = data
    }

    setMessages(prev => {
      if (prev.find(m => m.id === newMsg.id)) return prev
      return [...prev, { ...newMsg, reactions: {}, reads: [], reply_to: replyTo }]
    })

    // 🚀 SEND PUSH NOTIFICATION TO RECIPIENT
    try {
      // Get conversation participants to find who should receive notification
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
      
      if (participants) {
        // Find the other participant (not the sender)
        const recipient = participants.find(p => p.user_id !== currentUser.id)
        
        if (recipient) {
          // Get recipient's push subscription
          const { data: subscription } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', recipient.user_id)
            .single()
          
          // For now, trigger local notification for testing
          // In production, you'd send real push notification here
          if ('serviceWorker' in navigator && 'Notification' in window) {
            const registration = await navigator.serviceWorker.ready
            
            await registration.showNotification(`${currentUser.user_metadata?.full_name || 'Someone'}`, {
              body: content.trim(),
              icon: '/placeholder-logo.png',
              badge: '/placeholder-logo.png',
              tag: `message-${conversationId}`,
              requireInteraction: true,
              data: {
                messageId: newMsg.id,
                senderId: currentUser.id,
                chatId: conversationId,
                type: 'message',
                url: `/dashboard?tab=chat&chatId=${conversationId}`
              },
              actions: [
                { action: 'reply', title: 'Reply' },
                { action: 'mark-read', title: 'Mark as read' },
                { action: 'open', title: 'Open Chat' }
              ]
            } as NotificationOptions & {
              actions: Array<{ action: string; title: string }>
            })
            
            console.log('[Chat] Push notification sent for message:', newMsg.id)
          }
        }
      }
    } catch (notificationError) {
      console.error('[Chat] Failed to send push notification:', notificationError)
      // Don't fail the message send if notification fails
    }
  }, [conversationId, currentUser])

  // ✅ Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentUser || !newContent.trim()) return

    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent.trim(),
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', currentUser.id) // only own messages

    if (error) { console.error('Edit error:', error.message); return }

    setMessages(prev =>
      prev.map(m => m.id === messageId
        ? { ...m, content: newContent.trim(), is_edited: true, edited_at: new Date().toISOString() }
        : m
      )
    )
  }, [currentUser])

  const sendTyping = useCallback(() => {
    if (!presenceChannelRef.current || !currentUser) return

    if (!isTypingRef.current) {
      presenceChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: true },
      })
      isTypingRef.current = true
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current && currentUser) {
        presenceChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUser.id, isTyping: false },
        })
        isTypingRef.current = false
      }
    }, 2500)
  }, [currentUser])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return

    setMessages(prev => {
      const msg = prev.find(m => m.id === messageId)
      const alreadyReacted = msg?.reactions[emoji]?.reactedByMe
      if (alreadyReacted) {
        supabase.from('message_reactions').delete()
          .eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji)
          .then(() => refreshReactions(messageId))
      } else {
        supabase.from('message_reactions')
          .upsert({ message_id: messageId, user_id: currentUser.id, emoji })
          .then(() => refreshReactions(messageId))
      }
      return prev
    })
  }, [currentUser])

  const refreshReactions = async (messageId: string) => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('message_id', messageId)

    setMessages(prev =>
      prev.map(m => m.id === messageId
        ? { ...m, reactions: buildReactionsMap(data || [], currentUserRef.current?.id) }
        : m
      )
    )
  }

  // Presence channel
  useEffect(() => {
    if (!conversationId || !currentUser) return

    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe()
      presenceChannelRef.current = null
    }

    const presenceChannel = supabase
      .channel(`presence:${conversationId}`, {
        config: { presence: { key: currentUser.id } },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<{
          userId: string
          fullName: string
          avatarUrl: string | null
          onlineAt: string
        }>()

        const online: PresenceUser[] = Object.values(state)
          .flat()
          .filter(u => u.userId !== currentUser.id)

        setOnlineUsers(online)
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload
        if (userId === currentUser.id) return

        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()
          .then(({ data: profile }) => {
            if (!profile) return
            const name = profile.full_name || 'Someone'
            setTypingUsers(prev =>
              isTyping
                ? prev.includes(name) ? prev : [...prev, name]
                : prev.filter(n => n !== name)
            )
          })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            fullName: currentUser.user_metadata?.full_name || 'Unknown',
            avatarUrl: currentUser.user_metadata?.avatar_url || null,
            onlineAt: new Date().toISOString(),
          })
        }
      })

    presenceChannelRef.current = presenceChannel

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      presenceChannel.unsubscribe()
      presenceChannelRef.current = null
    }
  }, [conversationId, currentUser?.id || ''])

  // Messages realtime channel
  useEffect(() => {
    if (!conversationId) return

    setIsLoading(true)
    fetchMessages()

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    const channel = supabase
      .channel(`chat-room:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        if (payload.new.sender_id === currentUserRef.current?.id) return

        supabase
          .from('messages')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
          .then(async ({ data: fullMsg }) => {
            if (!fullMsg) return

            if (fullMsg.profiles?.full_name) {
              setTypingUsers(prev => prev.filter(n => n !== fullMsg.profiles?.full_name))
            }

            let replyTo = null
            if (fullMsg.reply_to_id) {
              const { data } = await supabase
                .from('messages')
                .select('*, profiles(id, full_name, avatar_url)')
                .eq('id', fullMsg.reply_to_id)
                .single()
              replyTo = data
            }

            setMessages(prev => {
              if (prev.find(m => m.id === fullMsg.id)) return prev
              return [...prev, { ...fullMsg, reactions: {}, reads: [], reply_to: replyTo }]
            })

            if (currentUserRef.current) {
              supabase.from('message_reads').upsert(
                [{ message_id: fullMsg.id, user_id: currentUserRef.current.id }],
                { onConflict: 'message_id,user_id', ignoreDuplicates: true }
              )
            }

            if (
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.visibilityState === 'hidden'
            ) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(
                  `New message from ${fullMsg.profiles?.full_name || 'Someone'}`,
                  {
                    body: fullMsg.content,
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    tag: `msg-${fullMsg.conversation_id}`,
                    data: { url: '/dashboard' },
                  }
                )
              })
            }
          })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        // ✅ Handle message edits in realtime
        setMessages(prev =>
          prev.map(m => m.id === payload.new.id
            ? { ...m, content: payload.new.content, is_edited: payload.new.is_edited, edited_at: payload.new.edited_at }
            : m
          )
        )
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions',
      }, (payload) => {
        const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id
        if (messageId) refreshReactions(messageId)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'message_reads',
      }, (payload) => {
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', payload.new.user_id)
          .single()
          .then(({ data: profile }) => {
            setMessages(prev =>
              prev.map(m => {
                if (m.id !== payload.new.message_id) return m
                if (m.reads.find(r => r.user_id === payload.new.user_id)) return m
                return {
                  ...m,
                  reads: [...m.reads, {
                    user_id: payload.new.user_id,
                    seen_at: payload.new.seen_at,
                    profiles: profile || undefined,
                  }],
                }
              })
            )
          })
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [conversationId, currentUser?.id, currentUserRef.current])

  return {
    messages,
    isLoading,
    sendMessage,
    editMessage,
    toggleReaction,
    markAsSeen,
    fetchMessages,
    sendTyping,
    typingUsers,
    onlineUsers,
  }
}