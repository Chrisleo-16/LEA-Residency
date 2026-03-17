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
  profiles?: Profile
  reactions: Record<string, Reaction>
  reads: MessageRead[]
}

export function useChat(conversationId: string | null, currentUser: User | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // ✅ Use ref to avoid stale closure in realtime callbacks
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

    const [{ data: rawReactions }, { data: rawReads }] = await Promise.all([
      supabase
        .from('message_reactions')
        .select('*, profiles(id, full_name, avatar_url)')
        .in('message_id', messageIds.length ? messageIds : ['00000000-0000-0000-0000-000000000000']),
      supabase
        .from('message_reads')
        .select('*, profiles(id, full_name, avatar_url)')
        .in('message_id', messageIds.length ? messageIds : ['00000000-0000-0000-0000-000000000000']),
    ])

    const enriched: Message[] = rawMessages.map(msg => ({
      ...msg,
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !conversationId || !currentUser) return

    const { data: newMsg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: content.trim(),
      })
      .select('*, profiles(id, full_name, avatar_url)')
      .single()

    if (error) { console.error('Send error:', error.message); return }

    // ✅ Optimistic update — message appears instantly for sender
    setMessages(prev => {
      if (prev.find(m => m.id === newMsg.id)) return prev
      return [...prev, { ...newMsg, reactions: {}, reads: [] }]
    })
  }, [conversationId, currentUser])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return

    // Use functional state to avoid stale closure
    setMessages(prev => {
      const msg = prev.find(m => m.id === messageId)
      const alreadyReacted = msg?.reactions[emoji]?.reactedByMe
      // Fire async side effect
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

  // ✅ Fixed realtime subscription — no async cleanup
  useEffect(() => {
  if (!conversationId) return

  setIsLoading(true)
  fetchMessages()

  if (channelRef.current) {
    supabase.removeChannel(channelRef.current)
    channelRef.current = null
  }

  const channel = supabase
    .channel(`chat-room:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new.sender_id === currentUserRef.current?.id) return

        supabase
          .from('messages')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data: fullMsg }) => {
            if (!fullMsg) return
            setMessages(prev => {
              if (prev.find(m => m.id === fullMsg.id)) return prev
              return [...prev, { ...fullMsg, reactions: {}, reads: [] }]
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
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => {
        const messageId =
          (payload.new as any)?.message_id ||
          (payload.old as any)?.message_id
        if (messageId) refreshReactions(messageId)
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'message_reads' },
      (payload) => {
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
                  reads: [
                    ...m.reads,
                    {
                      user_id: payload.new.user_id,
                      seen_at: payload.new.seen_at,
                      profiles: profile || undefined,
                    },
                  ],
                }
              })
            )
          })
      }
    )
    .subscribe((status) => {
    console.log(`[Chat ${conversationId}] Realtime status:`, status)
  // Should log "SUBSCRIBED" — if it logs "CLOSED" messages won't arrive
})
  channelRef.current = channel

  // ✅ Cleanup is a plain synchronous function — no async, no promise
  return () => {
    channel.unsubscribe()
    channelRef.current = null
  }
}, [conversationId]) // ✅ Only conversationId as dependency // ✅ Only re-run when conversationId changes

  return { messages, isLoading, sendMessage, toggleReaction, markAsSeen, fetchMessages }
}