'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Phone, MoreVertical } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import MessageBubble from '@/components/chat/MessageBubble'

interface ChatAreaProps {
  user: User | null
}

export default function ChatArea({ user }: ChatAreaProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [otherPersonName, setOtherPersonName] = useState('')
  const [otherPersonRole, setOtherPersonRole] = useState('')
  const [otherPersonAvatar, setOtherPersonAvatar] = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, isLoading, sendMessage, toggleReaction, markAsSeen } =
    useChat(conversationId, user)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!messages.length || !user) return
    const unseenIds = messages
      .filter(m => m.sender_id !== user.id && !m.reads.find(r => r.user_id === user.id))
      .map(m => m.id)
    if (unseenIds.length) markAsSeen(unseenIds)
  }, [messages, user])

  useEffect(() => {
    if (!user) return
    initChat()
  }, [user])

  const initChat = async () => {
    setInitLoading(true)

    const { data: myProfile } = await supabase
      .from('profiles').select('role').eq('id', user!.id).single()

    let otherPersonId: string | null = null

    if (myProfile?.role === 'tenant') {
      const { data } = await supabase
        .from('profiles').select('id, full_name, avatar_url')
        .eq('role', 'landlord').limit(1).single()
      otherPersonId = data?.id
      setOtherPersonName(data?.full_name || 'Landlord')
      setOtherPersonAvatar(data?.avatar_url || null)
      setOtherPersonRole('Landlord')
    } else {
      const { data } = await supabase
        .from('profiles').select('id, full_name, avatar_url')
        .eq('role', 'tenant').limit(1).single()
      otherPersonId = data?.id
      setOtherPersonName(data?.full_name || 'Tenant')
      setOtherPersonAvatar(data?.avatar_url || null)
      setOtherPersonRole('Tenant')
    }

    if (!otherPersonId) { setInitLoading(false); return }

    const { data: myParts } = await supabase
      .from('conversation_participants').select('conversation_id').eq('user_id', user!.id)

    let convId: string | null = null

    if (myParts?.length) {
      const ids = myParts.map(p => p.conversation_id)
      const { data: shared } = await supabase
        .from('conversation_participants').select('conversation_id')
        .eq('user_id', otherPersonId).in('conversation_id', ids).limit(1).single()
      convId = shared?.conversation_id ?? null
    }

    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations').insert({ type: 'direct' }).select().single()
      if (newConv) {
        await supabase.from('conversation_participants').insert([
          { conversation_id: newConv.id, user_id: user!.id },
          { conversation_id: newConv.id, user_id: otherPersonId },
        ])
        convId = newConv.id
      }
    }

    setConversationId(convId)
    setInitLoading(false)
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const content = newMessage
    setNewMessage('')
    inputRef.current?.focus()
    await sendMessage(content)
  }

  if (initLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <p className="text-foreground font-medium">No conversation yet</p>
        <p className="text-sm text-muted-foreground mt-1">Make sure a landlord account exists.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between shrink-0 bg-background shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0 overflow-hidden">
            {otherPersonAvatar ? (
              <img src={otherPersonAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-accent-foreground">
                {otherPersonName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{otherPersonName}</p>
            <p className="text-xs text-muted-foreground">{otherPersonRole} · LEA Executive</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-3">💬</span>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Say hello! 👋</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMe={msg.sender_id === user?.id}
              currentUserId={user?.id || ''}
              onReact={toggleReaction}
              showAvatar={false}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 border-t border-border flex gap-2 items-center shrink-0 bg-background">
        <Input
          ref={inputRef}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          className="flex-1 bg-input border-border text-foreground h-10 sm:h-11 text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground h-10 w-10 sm:h-11 sm:w-11 p-0 shrink-0 rounded-full"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}