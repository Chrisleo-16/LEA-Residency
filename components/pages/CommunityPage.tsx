'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Megaphone, MessageSquare } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import MessageBubble from '@/components/chat/MessageBubble'

interface CommunityPageProps {
  user: User | null
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

export default function CommunityPage({ user }: CommunityPageProps) {
  const [role, setRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'announcements'>('chat')
  const [communityConvId, setCommunityConvId] = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, isLoading, sendMessage, toggleReaction, markAsSeen } =
    useChat(communityConvId, user)

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
    initCommunity()
    fetchAnnouncements()
  }, [user])

  const initCommunity = async () => {
  setInitLoading(true)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  setRole(profile?.role || null)

  // ✅ Just fetch — never insert (pre-created in DB)
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'group')
    .limit(1)
    .maybeSingle()

  const convId = existing?.id ?? null

  if (!convId) {
    console.error('Group conversation not found — please create it in Supabase')
    setInitLoading(false)
    return
  }

  // Add user as participant if not already
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', convId)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!participant) {
    await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: convId,
        user_id: user!.id,
      })
  }

  setCommunityConvId(convId)
  setInitLoading(false)
}

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('policies').select('*').eq('category', 'announcement')
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const content = newMessage
    setNewMessage('')
    inputRef.current?.focus()
    await sendMessage(content)
  }

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await supabase.from('policies').insert({
      title: annTitle, content: annContent,
      category: 'announcement', created_by: user!.id,
    })
    setAnnTitle('')
    setAnnContent('')
    setIsSubmitting(false)
    fetchAnnouncements()
  }

  if (initLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Tabs */}
      <div className="flex border-b border-border bg-background shrink-0">
        {[
          { id: 'chat', label: 'Group Chat', icon: MessageSquare },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-3 sm:px-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Group Chat */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 sm:px-6 py-2.5 border-b border-border shrink-0">
            <p className="font-semibold text-foreground text-sm">LEA Community Chat</p>
            <p className="text-xs text-muted-foreground">All tenants and landlord</p>
          </div>

          <div
  className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3"
  style={{
    backgroundImage: `url('/images/best.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'local',
  }}
>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="text-4xl mb-3">👥</span>
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation! 👋</p>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={msg.sender_id === user?.id}
                  currentUserId={user?.id || ''}
                  onReact={toggleReaction}
                  showAvatar={true}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 sm:px-6 py-3 border-t border-border flex gap-2 items-center shrink-0 bg-background">
            <Input
              ref={inputRef}
              placeholder="Message the community..."
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
      )}

      {/* Announcements */}
      {activeTab === 'announcements' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {role === 'landlord' && (
            <Card className="p-4 sm:p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-foreground">Post Announcement</h3>
              </div>
              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <Input
                  placeholder="Announcement title"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  required
                  className="bg-input border-border text-foreground"
                />
                <textarea
                  placeholder="Write your announcement..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isSubmitting ? 'Posting...' : 'Post Announcement'}
                </Button>
              </form>
            </Card>
          )}

          {announcements.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No announcements yet</p>
            </div>
          ) : (
            announcements.map(ann => (
              <Card key={ann.id} className="p-4 sm:p-5 border border-border space-y-3">
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Megaphone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">{ann.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {new Date(ann.created_at).toLocaleDateString('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap pl-6">
                    {ann.content}
                  </p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment[ann.id] || ''}
                    onChange={(e) => setNewComment(prev => ({ ...prev, [ann.id]: e.target.value }))}
                    className="flex-1 bg-input border-border text-foreground text-sm h-9"
                  />
                  <Button
                    disabled={!newComment[ann.id]?.trim()}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground h-9 w-9 p-0 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
// ```

// ---

// **File placement summary:**
// ```
// hooks/useChat.ts                       ← new
// components/chat/MessageBubble.tsx      ← new
// components/chat/ChatArea.tsx           ← replace
// components/pages/CommunityPage.tsx     ← replace