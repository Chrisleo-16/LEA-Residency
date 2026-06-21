'use client'

import { useState, useEffect } from 'react'
import { Send, Megaphone, MessageSquare, Users, ChevronDown, ChevronUp } from 'lucide-react'
import {
  generateDemoCommunityMessages, generateDemoAnnouncements,
  DemoMessage, DemoAnnouncement
} from '@/lib/demo/demoData'

interface DemoCommunityPageProps {
  demoName: string
  demoRole: 'tenant' | 'landlord'
}

export default function DemoCommunityPage({ demoName, demoRole }: DemoCommunityPageProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'announcements'>('chat')
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [announcements, setAnnouncements] = useState<DemoAnnouncement[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [expandedAnn, setExpandedAnn] = useState<string | null>(null)

  useEffect(() => {
    setMessages(generateDemoCommunityMessages())
    setAnnouncements(generateDemoAnnouncements())
  }, [])

  const handleSend = () => {
    if (!newMessage.trim()) return
    setMessages(prev => [...prev, {
      id: `demo-community-sent-${Date.now()}`,
      content: newMessage,
      sender_id: 'demo-self',
      sender_name: demoName,
      created_at: new Date().toISOString(),
      is_me: true,
    }])
    setNewMessage('')
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex border-b border-border bg-card shrink-0">
        {[
          { id: 'chat', label: 'Group Chat', icon: MessageSquare },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all relative ${
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />}
            </button>
          )
        })}
      </div>

      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-card shrink-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">LEA Community Chat</p>
              <p className="text-xs text-muted-foreground">{messages.length} messages · All residents</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 bg-secondary/20">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.is_me ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  msg.is_me ? 'bg-accent text-white rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'
                }`}>
                  {!msg.is_me && (
                    <p className="text-[11px] font-semibold text-accent mb-0.5">{msg.sender_name}</p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 sm:px-5 py-3.5 border-t border-border flex gap-3 items-center bg-card shrink-0">
            <input
              placeholder="Message the community..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-secondary border border-border rounded-xl h-11 px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="bg-accent hover:bg-accent/90 text-white h-11 w-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-5 sm:p-8 space-y-4 max-w-2xl mx-auto">
            <div>
              <h3 className="font-bold text-foreground text-lg">Announcements</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{announcements.length} announcements</p>
            </div>

            <div className="space-y-3">
              {announcements.map((ann, index) => {
                const isExpanded = expandedAnn === ann.id
                return (
                  <div key={ann.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div
                      className="p-5 cursor-pointer"
                      onClick={() => setExpandedAnn(isExpanded ? null : ann.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          index === 0 ? 'bg-accent/10' : 'bg-secondary'
                        }`}>
                          <Megaphone className={`w-4 h-4 ${index === 0 ? 'text-accent' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-sm">{ann.title}</h4>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">📅 {formatDate(ann.created_at)}</p>
                          {!isExpanded && (
                            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">{ann.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border px-5 py-4">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}