'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Phone, MoreVertical, Users, X, Search, MessageSquare } from 'lucide-react'
import { useChat, Message } from '@/hooks/useChat'
import MessageBubble from '@/components/chat/MessageBubble'

interface ChatAreaProps {
  user: User | null
}

interface TenantConversation {
  conversationId: string
  tenantId: string
  tenantName: string
  tenantAvatar: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export default function ChatArea({ user }: ChatAreaProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [otherPersonName, setOtherPersonName] = useState('')
  const [otherPersonRole, setOtherPersonRole] = useState('')
  const [otherPersonAvatar, setOtherPersonAvatar] = useState<string | null>(null)
  const [otherPersonId, setOtherPersonId] = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [tenantConversations, setTenantConversations] = useState<TenantConversation[]>([])
  const [showTenantList, setShowTenantList] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [tenantSearch, setTenantSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages, isLoading, sendMessage, editMessage, toggleReaction,
    markAsSeen, sendTyping, typingUsers, onlineUsers,
  } = useChat(conversationId, user)

  const isOtherPersonOnline = onlineUsers.some(u => u.userId === otherPersonId)

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

  const fetchTenantConversations = useCallback(async () => {
    if (!user) return
    const { data: allTenants } = await supabase
      .from('profiles').select('id, full_name, avatar_url').eq('role', 'tenant')
    if (!allTenants?.length) return

    const { data: myParticipations } = await supabase
      .from('conversation_participants').select('conversation_id').eq('user_id', user.id)
    const myConvIds = myParticipations?.map(p => p.conversation_id) || []

    const { data: otherParticipants } = myConvIds.length
      ? await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', myConvIds)
          .neq('user_id', user.id)
      : { data: [] }

    const result: TenantConversation[] = await Promise.all(
      allTenants.map(async (tenant) => {
        const existingConv = otherParticipants?.find(p => p.user_id === tenant.id)
        const convId = existingConv?.conversation_id || ''
        let lastMessage = 'No messages yet'
        let lastMessageTime = ''
        let unreadCount = 0

        if (convId) {
          const { data: lastMsg } = await supabase
            .from('messages').select('content, created_at')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
          lastMessage = lastMsg?.content || 'No messages yet'
          lastMessageTime = lastMsg?.created_at || ''

          const { data: readIds } = await supabase
            .from('message_reads').select('message_id').eq('user_id', user.id)
          const readMessageIds = readIds?.map(r => r.message_id) || []

          const { count } = await supabase
            .from('messages').select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId).neq('sender_id', user.id)
            .not('id', 'in', readMessageIds.length
              ? `(${readMessageIds.join(',')})`
              : '(00000000-0000-0000-0000-000000000000)')
          unreadCount = count || 0
        }

        return {
          conversationId: convId,
          tenantId: tenant.id,
          tenantName: tenant.full_name || 'Unknown Tenant',
          tenantAvatar: tenant.avatar_url || null,
          lastMessage,
          lastMessageTime,
          unreadCount,
        }
      })
    )

    result.sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0
      if (!a.lastMessageTime) return 1
      if (!b.lastMessageTime) return -1
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    })
    setTenantConversations(result)
  }, [user])

  const getOrCreateConversation = useCallback(async (userId: string, otherId: string): Promise<string | null> => {
    try {
      // Check if conversation already exists
      const { data: myParts, error: myPartsError } = await supabase
        .from('conversation_participants').select('conversation_id').eq('user_id', userId)

      if (myPartsError) {
        console.error('Error fetching my conversations:', myPartsError)
        return null
      }

      if (myParts?.length) {
        const ids = myParts.map(p => p.conversation_id)
        const { data: shared, error: sharedError } = await supabase
          .from('conversation_participants').select('conversation_id')
          .eq('user_id', otherId).in('conversation_id', ids).limit(1).maybeSingle()
        
        if (sharedError) {
          console.error('Error checking shared conversation:', sharedError)
        } else if (shared?.conversation_id) {
          return shared.conversation_id
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations').insert({ type: 'direct' }).select().single()
      
      if (convError) {
        console.error('Error creating conversation:', convError)
        return null
      }

      if (newConv) {
        const { error: partError } = await supabase.from('conversation_participants').insert([
          { conversation_id: newConv.id, user_id: userId },
          { conversation_id: newConv.id, user_id: otherId },
        ])
        
        if (partError) {
          console.error('Error adding participants:', partError)
          return null
        }
        
        console.log('New conversation created:', newConv.id)
        return newConv.id
      }
    } catch (error) {
      console.error('Unexpected error in getOrCreateConversation:', error)
      return null
    }
    
    return null
  }, [])

  useEffect(() => {
    if (!user) return
    const init = async () => {
      setInitLoading(true)
      const { data: myProfile, error: profileError } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profileError) { setInitLoading(false); return }

      const role = myProfile?.role
      setUserRole(role)

      if (role === 'tenant') {
        const { data: landlord } = await supabase
          .from('profiles').select('id, full_name, avatar_url')
          .eq('role', 'landlord').limit(1).maybeSingle()
        if (!landlord) { setInitLoading(false); return }
        setOtherPersonName(landlord.full_name || 'Landlord')
        setOtherPersonAvatar(landlord.avatar_url || null)
        setOtherPersonRole('Landlord')
        setOtherPersonId(landlord.id)
        const convId = await getOrCreateConversation(user.id, landlord.id)
        setConversationId(convId)
      } else if (role === 'landlord') {
        await fetchTenantConversations()
      }
      setInitLoading(false)
    }
    init()
  }, [user, fetchTenantConversations, getOrCreateConversation])

  useEffect(() => {
    if (userRole !== 'landlord' || !user) return
    fetchTenantConversations()
    const channel = supabase.channel('landlord-message-watcher')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchTenantConversations()
      }).subscribe()
    return () => { channel.unsubscribe() }
  }, [userRole, user, fetchTenantConversations])

  const selectTenant = async (tenant: TenantConversation) => {
    setOtherPersonName(tenant.tenantName)
    setOtherPersonAvatar(tenant.tenantAvatar)
    setOtherPersonRole('Tenant')
    setOtherPersonId(tenant.tenantId)
    setShowTenantList(false)
    setReplyingTo(null)
    if (tenant.conversationId) {
      setConversationId(tenant.conversationId)
    } else {
      const convId = await getOrCreateConversation(user!.id, tenant.tenantId)
      setConversationId(convId)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const content = newMessage
    const replyId = replyingTo?.id
    setNewMessage('')
    setReplyingTo(null)
    inputRef.current?.focus()
    await sendMessage(content, replyId)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (e.target.value.trim()) sendTyping()
  }

  const toUTC = (dateStr: string) =>
  new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = toUTC(dateStr)
  const now = new Date()
  // Compare dates in Nairobi timezone
  const nairobiNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }))
  const nairobiDate = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }))
  const isToday = nairobiDate.toDateString() === nairobiNow.toDateString()
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
}

  const filteredTenants = tenantConversations.filter(t =>
    t.tenantName.toLowerCase().includes(tenantSearch.toLowerCase())
  )

  if (initLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Landlord tenant sidebar ───────────────────────── */}
      {userRole === 'landlord' && (
        <>
          {showTenantList && (
            <div className="fixed inset-0 bg-black/50 z-10 md:hidden"
              onClick={() => setShowTenantList(false)} />
          )}

          <div className={`
            fixed md:relative inset-y-0 left-0 z-20
            w-80 bg-card border-r border-border
            flex flex-col h-full
            transition-transform duration-300 ease-in-out
            ${showTenantList ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
          `}>
            {/* Sidebar header */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-foreground">Conversations</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tenantConversations.length} tenant{tenantConversations.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowTenantList(false)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Search tenants */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Search tenants..."
                  value={tenantSearch}
                  onChange={e => setTenantSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredTenants.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No tenants yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Tenants will appear here</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredTenants.map((tenant) => {
                    const isOnline = onlineUsers.some(u => u.userId === tenant.tenantId)
                    const isSelected = conversationId === tenant.conversationId
                    return (
                      <button
                        key={tenant.tenantId}
                        onClick={() => selectTenant(tenant)}
                        className={`
                          w-full p-3 flex items-center gap-3 rounded-xl text-left
                          transition-all duration-150
                          ${isSelected
                            ? 'bg-accent/10 border border-accent/20'
                            : 'hover:bg-secondary border border-transparent'
                          }
                        `}
                      >
                        <div className="relative shrink-0">
                          <div className={`
                            w-11 h-11 rounded-full flex items-center justify-center overflow-hidden
                            ${isSelected ? 'ring-2 ring-accent ring-offset-1' : ''}
                            bg-accent/10
                          `}>
                            {tenant.tenantAvatar ? (
                              <img src={tenant.tenantAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-accent">
                                {tenant.tenantName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                              {tenant.tenantName}
                            </p>
                            {tenant.lastMessageTime && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatTime(tenant.lastMessageTime)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {tenant.lastMessage}
                          </p>
                        </div>

                        {tenant.unreadCount > 0 && (
                          <div className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                            {tenant.unreadCount}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main Chat Area ────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* Mobile tenant toggle */}
        {userRole === 'landlord' && (
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
            <button
              onClick={() => setShowTenantList(true)}
              className="p-2 rounded-xl hover:bg-secondary text-foreground transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-foreground text-sm truncate px-2">
              {otherPersonName || 'Select a tenant'}
            </h1>
            <div className="w-9" />
          </div>
        )}

        {/* Empty state */}
        {!conversationId ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mb-5">
              <MessageSquare className="w-9 h-9 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {userRole === 'landlord' ? 'Select a Conversation' : 'No Conversation Yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {userRole === 'landlord'
                ? 'Choose a tenant from the list to start chatting'
                : 'Your landlord account is being set up'
              }
            </p>
            {userRole === 'landlord' && (
              <button
                onClick={() => setShowTenantList(true)}
                className="md:hidden mt-5 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium"
              >
                View Tenants
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0 bg-card">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                    {otherPersonAvatar ? (
                      <img src={otherPersonAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-accent">
                        {otherPersonName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isOtherPersonOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm leading-tight">{otherPersonName}</p>
                  {typingUsers.length > 0 ? (
                    <p className="text-xs text-accent animate-pulse mt-0.5">{typingUsers[0]} is typing...</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isOtherPersonOnline
                        ? <span className="text-green-500 font-medium">● Online</span>
                        : `${otherPersonRole} · LEA Executive`
                      }
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3"
              style={{
                backgroundImage: `url('/images/best.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'local',
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center mb-3 shadow-sm">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground bg-white/70 backdrop-blur px-3 py-1 rounded-full">
                    No messages yet — say hello! 👋
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMe={msg.sender_id === user?.id}
                    currentUserId={user?.id || ''}
                    onReact={toggleReaction}
                    onReply={setReplyingTo}
                    onEdit={editMessage}
                    showAvatar={false}
                  />
                ))
              )}

              {/* Typing bubble */}
              {typingUsers.length > 0 && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-white">
                    {otherPersonName.charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-card/90 backdrop-blur px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply bar */}
            {replyingTo && (
              <div className="px-4 sm:px-5 py-2.5 border-t border-border bg-secondary/50 backdrop-blur flex items-center gap-3 shrink-0">
                <div className="w-0.5 h-9 bg-accent rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-accent">
                    Replying to {replyingTo.profiles?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{replyingTo.content}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 sm:px-5 py-3.5 border-t border-border flex gap-3 items-center shrink-0 bg-card">
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="flex-1 bg-secondary border-border text-foreground h-11 text-sm rounded-xl"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="bg-accent hover:bg-accent/90 text-white h-11 w-11 p-0 shrink-0 rounded-xl shadow-md shadow-accent/25"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}