'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { generateDemoChatMessages, DemoMessage } from '@/lib/demo/demoData'

interface DemoChatPageProps {
  demoName: string
  demoRole: 'tenant' | 'landlord'
}

export default function DemoChatPage({ demoName, demoRole }: DemoChatPageProps) {
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(generateDemoChatMessages(demoRole, demoName))
  }, [demoRole, demoName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const otherName = demoRole === 'tenant' ? 'David Kamau (Landlord)' : 'Sarah Mwangi (Tenant)'

  const handleSend = () => {
    if (!newMessage.trim()) return
    const msg: DemoMessage = {
      id: `demo-sent-${Date.now()}`,
      content: newMessage,
      sender_id: 'demo-self',
      sender_name: demoName,
      created_at: new Date().toISOString(),
      is_me: true,
    }
    setMessages(prev => [...prev, msg])
    setNewMessage('')

    // Simulated reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `demo-reply-${Date.now()}`,
        content: demoRole === 'tenant'
          ? 'Thanks for letting me know! I\'ll follow up shortly.'
          : 'Got it, thank you for the update!',
        sender_id: 'demo-other',
        sender_name: otherName,
        created_at: new Date().toISOString(),
        is_me: false,
      }])
    }, 1500)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-card shrink-0">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <span className="text-sm font-bold text-accent">{otherName.charAt(0)}</span>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{otherName}</p>
          <p className="text-xs text-green-500 font-medium">● Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 bg-secondary/20">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.is_me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
              msg.is_me
                ? 'bg-accent text-white rounded-br-sm'
                : 'bg-card border border-border rounded-bl-sm'
            }`}>
              <p className="text-sm">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.is_me ? 'text-white/60' : 'text-muted-foreground'}`}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 sm:px-5 py-3.5 border-t border-border flex gap-3 items-center bg-card shrink-0">
        <input
          placeholder="Type a message..."
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
  )
}