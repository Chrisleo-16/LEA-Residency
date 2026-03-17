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

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    const { data: rawMessages } = await supabase
      .from('messages')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!rawMessages) return

    const messageIds = rawMessages.map(m => m.id)

    const { data: rawReactions } = await supabase
      .from('message_reactions')
      .select('*, profiles(id, full_name, avatar_url)')
      .in('message_id', messageIds)

    const { data: rawReads } = await supabase
      .from('message_reads')
      .select('*, profiles(id, full_name, avatar_url)')
      .in('message_id', messageIds)

    const enriched: Message[] = rawMessages.map(msg => {
      const msgReactions = (rawReactions || []).filter(r => r.message_id === msg.id)
      const msgReads = (rawReads || []).filter(r => r.message_id === msg.id)

      const reactionsMap: Record<string, Reaction> = {}
      msgReactions.forEach(r => {
        if (!reactionsMap[r.emoji]) {
          reactionsMap[r.emoji] = { emoji: r.emoji, count: 0, users: [], reactedByMe: false }
        }
        reactionsMap[r.emoji].count++
        reactionsMap[r.emoji].users.push(r.profiles)
        if (r.user_id === currentUser?.id) {
          reactionsMap[r.emoji].reactedByMe = true
        }
      })

      return { ...msg, reactions: reactionsMap, reads: msgReads }
    })

    setMessages(enriched)
    setIsLoading(false)
  }, [conversationId, currentUser?.id])

  const markAsSeen = useCallback(async (messageIds: string[]) => {
    if (!currentUser || !messageIds.length) return
    const inserts = messageIds.map(id => ({
      message_id: id,
      user_id: currentUser.id,
    }))
    await supabase
      .from('message_reads')
      .upsert(inserts, { onConflict: 'message_id,user_id', ignoreDuplicates: true })
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

    // ✅ Optimistic update — appears instantly
    setMessages(prev => [...prev, { ...newMsg, reactions: {}, reads: [] }])
  }, [conversationId, currentUser])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return

    const msg = messages.find(m => m.id === messageId)
    const alreadyReacted = msg?.reactions[emoji]?.reactedByMe

    if (alreadyReacted) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUser.id)
        .eq('emoji', emoji)
    } else {
      await supabase
        .from('message_reactions')
        .upsert({ message_id: messageId, user_id: currentUser.id, emoji })
    }

    const { data: updatedReactions } = await supabase
      .from('message_reactions')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('message_id', messageId)

    const reactionsMap: Record<string, Reaction> = {}
    ;(updatedReactions || []).forEach(r => {
      if (!reactionsMap[r.emoji]) {
        reactionsMap[r.emoji] = { emoji: r.emoji, count: 0, users: [], reactedByMe: false }
      }
      reactionsMap[r.emoji].count++
      reactionsMap[r.emoji].users.push(r.profiles)
      if (r.user_id === currentUser.id) {
        reactionsMap[r.emoji].reactedByMe = true
      }
    })

    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, reactions: reactionsMap } : m)
    )
  }, [messages, currentUser])

  // ✅ Fixed realtime — proper useEffect cleanup
  useEffect(() => {
    if (!conversationId) return

    fetchMessages()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`chat-room:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        // Skip our own — already added optimistically
        if (payload.new.sender_id === currentUser?.id) return

        const { data: fullMsg } = await supabase
          .from('messages')
          .select('*, profiles(id, full_name, avatar_url)')
          .eq('id', payload.new.id)
          .single()

        if (fullMsg) {
          setMessages(prev => {
            if (prev.find(m => m.id === fullMsg.id)) return prev
            return [...prev, { ...fullMsg, reactions: {}, reads: [] }]
          })
          await markAsSeen([fullMsg.id])
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'message_reactions',
      }, () => { fetchMessages() })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'message_reads',
      }, async (payload) => {
        const { data: readProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', payload.new.user_id)
          .single()

        setMessages(prev =>
          prev.map(m => {
            if (m.id !== payload.new.message_id) return m
            if (m.reads.find(r => r.user_id === payload.new.user_id)) return m
            return {
              ...m,
              reads: [...m.reads, {
                user_id: payload.new.user_id,
                seen_at: payload.new.seen_at,
                profiles: readProfile || undefined,
              }],
            }
          })
        )
      })
      .subscribe()

    channelRef.current = channel

    // ✅ Proper cleanup
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [conversationId, currentUser?.id])

  return { messages, isLoading, sendMessage, toggleReaction, markAsSeen, fetchMessages }
}