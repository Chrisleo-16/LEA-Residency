'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
  onCancel: () => void
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      // Guarantee release of microhpone if unmounted during active recording
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Determine the best supported mimeType for web-friendly recording
      let options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = { mimeType: 'audio/webm' }
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = { mimeType: 'audio/ogg;codecs=opus' }
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = { mimeType: 'audio/mp4' } // Safari / iOS fallback
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options = {} // Default browser selection
      }
      
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeTypeUsed = mediaRecorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeTypeUsed })
        setAudioBlob(blob)
        
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Stop all tracks to release microphone hardware immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      
      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please grant permission in browser settings.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime)
      resetRecorder()
    }
  }

  const handleCancel = () => {
    resetRecorder()
    onCancel()
  }

  const resetRecorder = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsRecording(false)
    chunksRef.current = []
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Explicitly stop all stream tracks if cancel is clicked
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlaybackEnd = () => {
    console.log('Voice note preview playback ended')
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl border border-border">
      {/* Recording status indicator */}
      {isRecording && (
        <div className="flex-1 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse animate-duration-1000" />
          <span className="text-sm font-mono font-medium text-foreground">
            Recording: {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Audio preview playback */}
      {audioUrl && !isRecording && (
        <div className="flex-1 flex items-center gap-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="h-8 flex-1 focus:outline-none"
            onEnded={handlePlaybackEnd}
          />
          <span className="text-xs text-muted-foreground font-mono">{formatTime(recordingTime)}</span>
        </div>
      )}

      {!isRecording && !audioBlob && (
        <span className="flex-1 text-sm text-muted-foreground">Click mic to record voice note</span>
      )}

      {/* Control Actions */}
      <div className="flex items-center gap-2">
        {!isRecording && !audioBlob && (
          <Button
            type="button"
            size="icon"
            variant="default"
            onClick={startRecording}
            className="w-10 h-10 rounded-full bg-accent hover:bg-accent/90"
            title="Start Recording"
          >
            <Mic className="w-4 h-4 text-accent-foreground" />
          </Button>
        )}

        {isRecording && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={stopRecording}
            className="w-10 h-10 rounded-full"
            title="Stop Recording"
          >
            <MicOff className="w-4 h-4" />
          </Button>
        )}

        {audioBlob && !isRecording && (
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCancel}
              className="w-10 h-10 rounded-full hover:bg-secondary"
              title="Delete Preview"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="default"
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-accent hover:bg-accent/90"
              title="Send Voice Note"
            >
              <Send className="w-4 h-4 text-accent-foreground" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
