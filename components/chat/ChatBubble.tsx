'use client'

import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Mic, Lock, Eye, EyeOff, Play, Pause, AlertCircle, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMediaDeliveryUrl, trackMediaView } from '@/app/actions/chat-media'

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

interface ChatBubbleProps {
  message: Message
  currentUserId: string
  isOwnMessage: boolean
}

export default function ChatBubble({ message, currentUserId, isOwnMessage }: ChatBubbleProps) {
  const [showModal, setShowModal] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(message.metadata?.duration || 0)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackTrackedRef = useRef(false)
  
  // Keep refs of key values for unmount cleanup trigger
  const isPlayingRef = useRef(isPlaying)
  const isOwnMessageRef = useRef(isOwnMessage)
  const messageIdRef = useRef(message.id)
  const statusRef = useRef(message.status)
  const viewModeRef = useRef(message.view_mode)

  // Sync refs with state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying
    isOwnMessageRef.current = isOwnMessage
    messageIdRef.current = message.id
    statusRef.current = message.status
    viewModeRef.current = message.view_mode
  }, [isPlaying, isOwnMessage, message.id, message.status, message.view_mode])

  // Reset state when message changes
  useEffect(() => {
    setShowModal(false)
    setMediaUrl(null)
    setIsLoading(false)
    setError(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(message.metadata?.duration || 0)
    playbackTrackedRef.current = false
  }, [message.id, message.metadata?.duration])

  // Cleanup/unmount listener to trigger trackMediaView if user exits mid-playback
  useEffect(() => {
    return () => {
      if (
        !isOwnMessageRef.current &&
        (viewModeRef.current === 'once' || viewModeRef.current === 'twice') &&
        statusRef.current === 'sent' &&
        isPlayingRef.current &&
        !playbackTrackedRef.current
      ) {
        playbackTrackedRef.current = true
        trackMediaView(messageIdRef.current).catch((err) => {
          console.error('[ChatBubble] Exit track view failed:', err)
        })
      }
    }
  }, [])

  // Auto-play audio when signed delivery URL is fetched
  useEffect(() => {
    if (mediaUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err)
        setIsPlaying(false)
      })
    }
  }, [mediaUrl, isPlaying])

  // Ephemeral Image view click sequence
  const handleImageClick = async () => {
    if (message.status !== 'sent') return

    setIsLoading(true)
    setError(null)

    try {
      // 1. If recipient, call trackMediaView immediately when modal opens
      if (!isOwnMessage) {
        const trackResult = await trackMediaView(message.id)
        if (!trackResult.success) {
          throw new Error(trackResult.error || 'Failed to register view')
        }
        if (trackResult.expired) {
          throw new Error('This image has expired')
        }
      }

      // 2. Fetch secure signed delivery URL (valid for 30s)
      const urlResult = await getMediaDeliveryUrl(message.id)
      if (!urlResult.success || !urlResult.signedUrl) {
        throw new Error(urlResult.error || 'Failed to retrieve media URL')
      }

      setMediaUrl(urlResult.signedUrl)
      setShowModal(true)
    } catch (err: any) {
      setError(err.message || 'Failed to open image')
    } finally {
      setIsLoading(false)
    }
  }

  // Ephemeral Voice Note play sequence
  const handleAudioPlay = async () => {
    if (message.status !== 'sent') return

    // If audio is already loaded and paused, resume playback
    if (audioRef.current && mediaUrl) {
      audioRef.current.play()
      setIsPlaying(true)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get signed delivery URL
      const urlResult = await getMediaDeliveryUrl(message.id)
      if (!urlResult.success || !urlResult.signedUrl) {
        throw new Error(urlResult.error || 'Failed to load audio')
      }

      setMediaUrl(urlResult.signedUrl)
      setIsPlaying(true)
    } catch (err: any) {
      setError(err.message || 'Failed to play voice note')
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAudioPause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
  }

  const handleAudioEnded = async () => {
    setIsPlaying(false)
    setCurrentTime(0)

    // Trigger media view tracking the moment playback completes for a recipient
    if (!isOwnMessage && (message.view_mode === 'once' || message.view_mode === 'twice')) {
      playbackTrackedRef.current = true
      try {
        await trackMediaView(message.id)
      } catch (err) {
        console.error('[ChatBubble] Failed to expire audio on end:', err)
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Layout Renders
  const renderDeletedMessage = () => (
    <div className="px-4 py-2.5 text-xs text-muted-foreground italic flex items-center gap-1.5 bg-secondary/35 rounded-2xl">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>This message was deleted</span>
    </div>
  )

  const renderExpiredMessage = () => {
    const isImage = message.message_type === 'image'
    return (
      <div className="px-4 py-3 flex items-center gap-2 bg-secondary/30 text-muted-foreground/60 rounded-2xl border border-border/10 select-none">
        <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
        <span className="text-xs font-medium">
          {isImage ? 'Opened' : 'Played Voice Note'}
        </span>
      </div>
    )
  }

  const renderEphemeralBadge = () => {
    if (message.view_mode === 'fulltime') return null
    return (
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
        {message.view_mode === 'once' ? (
          <EyeOff className="w-3 h-3 text-accent-foreground" />
        ) : (
          <Eye className="w-3 h-3 text-accent-foreground" />
        )}
        <span className="text-[10px] font-semibold text-white uppercase tracking-wider">
          {message.view_mode === 'once' ? '1 View' : '2 Views'}
        </span>
      </div>
    )
  }

  const renderTextContent = () => {
    if (!message.content) return null
    return (
      <div className="px-4 py-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    )
  }

  const renderImageContent = () => {
    if (message.status === 'deleted') return renderDeletedMessage()
    if (message.status === 'expired') return renderExpiredMessage()

    const isEphemeral = message.view_mode !== 'fulltime'

    return (
      <div className="relative group">
        {renderEphemeralBadge()}
        <div
          onClick={handleImageClick}
          className={`relative max-w-sm rounded-2xl overflow-hidden cursor-pointer shadow-lg transition-transform duration-200 hover:scale-[1.01] ${
            isEphemeral ? 'ring-2 ring-accent/30' : ''
          }`}
        >
          <div className="aspect-[4/3] bg-secondary/40 flex items-center justify-center relative">
            {/* Display a rich overlay for view once/twice images */}
            {isEphemeral ? (
              <div className="absolute inset-0 bg-secondary-foreground/80 flex flex-col items-center justify-center p-4 text-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground mb-2 animate-bounce" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Click to View Image
                </span>
                <span className="text-[10px] text-muted-foreground/60 mt-1">
                  {message.view_mode === 'once' ? 'Disappears after opening' : 'Disappears after 2 openings'}
                </span>
              </div>
            ) : (
              // Full-time fallback placeholder (if the image is permanent)
              <div className="absolute inset-0 bg-secondary/30 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
        {message.content && renderTextContent()}
      </div>
    )
  }

  const renderAudioContent = () => {
    if (message.status === 'deleted') return renderDeletedMessage()
    if (message.status === 'expired') return renderExpiredMessage()

    const isEphemeral = message.view_mode !== 'fulltime'
    const progress = (currentTime / (duration || 1)) * 100

    return (
      <div className="relative">
        {renderEphemeralBadge()}
        
        {/* Custom Premium Audio Player UI Container */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary/20 min-w-[260px] border border-border/5 ${
          isEphemeral ? 'ring-1 ring-accent/30' : ''
        }`}>
          {/* Custom Play/Pause Control Button */}
          {!isPlaying ? (
            <Button
              type="button"
              size="icon"
              variant="default"
              onClick={handleAudioPlay}
              disabled={isLoading}
              className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all ${
                isEphemeral 
                  ? 'bg-accent hover:bg-accent/90 text-accent-foreground shadow-md shadow-accent/20' 
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              variant="default"
              onClick={handleAudioPause}
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-accent text-accent-foreground shadow-md shadow-accent/20 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
            </Button>
          )}

          {/* Timeline and Waveform track */}
          <div className="flex-1 flex flex-col gap-1 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Voice Note
                </span>
              </div>
              {isEphemeral && (
                <span className="text-[9px] text-accent/80 font-bold uppercase tracking-wider">
                  Ephemeral
                </span>
              )}
            </div>
            {/* Custom slider track */}
            <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
              <div
                className="absolute top-0 left-0 h-full bg-accent transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timer and Badge indicator */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-xs font-mono font-semibold text-muted-foreground/80">
              {formatTime(currentTime || duration)}
            </span>
          </div>
        </div>

        {mediaUrl && (
          <audio
            ref={audioRef}
            src={mediaUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            onPause={handleAudioPause}
            className="hidden"
          />
        )}

        {message.content && renderTextContent()}
      </div>
    )
  }

  return (
    <>
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className="flex flex-col max-w-[70%] group">
          {/* Sender profile information for group room layout */}
          {!isOwnMessage && message.sender && (
            <span className="text-xs font-bold text-muted-foreground ml-2 mb-1 uppercase tracking-wider">
              {message.sender.full_name}
            </span>
          )}

          <div
            className={`rounded-2xl shadow-sm ${
              isOwnMessage
                ? 'bg-accent text-accent-foreground rounded-tr-none'
                : 'bg-secondary text-foreground rounded-tl-none'
            }`}
          >
            {/* Message payload selector */}
            {message.message_type === 'text' && renderTextContent()}
            {message.message_type === 'image' && renderImageContent()}
            {message.message_type === 'audio' && renderAudioContent()}

            {/* Bubble timestamp & metadata status */}
            <div className={`px-3 py-1 flex items-center justify-end gap-1.5 ${
              isOwnMessage ? 'text-accent-foreground/60' : 'text-muted-foreground/60'
            }`}>
              <span className="text-[10px] font-mono select-none">
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Image Modal overlay for Ephemeral Images */}
      {showModal && mediaUrl && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 animate-fade-in">
          {/* Modal Header */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-white/80">
              <Lock className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold tracking-wider uppercase">
                {message.view_mode === 'once' ? 'View Once Media' : 'View Twice Media'}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowModal(false)}
              className="text-white hover:text-white hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Large Image display */}
          <div className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center select-none">
            <img
              src={mediaUrl}
              alt="Ephemeral media view"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/5"
              onContextMenu={(e) => e.preventDefault()} // Block right click
            />
          </div>

          {/* Optional Caption Overlay */}
          {message.content && (
            <div className="mt-4 max-w-2xl px-6 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-white/90 text-sm text-center">
              {message.content}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-destructive/90 text-white rounded-lg flex items-center gap-2 animate-bounce">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
