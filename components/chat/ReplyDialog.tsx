'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Reply, 
  X, 
  Send,
  User,
  Clock
} from 'lucide-react'
import { ReplyDialogData } from '@/lib/message-handler'

interface ReplyDialogProps {
  isOpen: boolean
  onClose: () => void
  replyData: ReplyDialogData | null
  onSendReply: (message: string, replyData: ReplyDialogData) => Promise<void>
}

export default function ReplyDialog({ 
  isOpen, 
  onClose, 
  replyData, 
  onSendReply 
}: ReplyDialogProps) {
  const [replyMessage, setReplyMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [quickReplies] = useState([
    'Okay 👍',
    'I\'ll get back to you',
    'Thanks for letting me know',
    'Can we discuss this later?',
    'Got it, thanks!'
  ])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Reset message when dialog opens
      setReplyMessage('')
    }
  }, [isOpen, replyData])

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !replyData || isSending) return

    setIsSending(true)
    try {
      await onSendReply(replyMessage.trim(), replyData)
      setReplyMessage('')
      onClose()
    } catch (error) {
      console.error('Failed to send reply:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleQuickReply = (quickReply: string) => {
    setReplyMessage(quickReply)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen || !replyData) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Reply className="w-4 h-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">Reply to Message</CardTitle>
                <CardDescription>
                  Quick reply from notification
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Original Message Preview */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-3 h-3" />
              <span className="font-medium">{replyData.notificationTitle}</span>
              <Clock className="w-3 h-3 ml-auto" />
              <span className="text-xs">{formatTime(new Date().toISOString())}</span>
            </div>
            <p className="text-sm text-foreground">
              {replyData.notificationBody}
            </p>
          </div>

          {/* Quick Replies */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick replies:</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((quickReply) => (
                <Button
                  key={quickReply}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickReply(quickReply)}
                  className="text-xs h-7"
                >
                  {quickReply}
                </Button>
              ))}
            </div>
          </div>

          {/* Reply Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Your reply:
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || isSending}
                size="sm"
              >
                {isSending ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!replyMessage.trim() || isSending}
              className="flex-1"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
