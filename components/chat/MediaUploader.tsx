'use client'

import { useState, useRef } from 'react'
import { Image as ImageIcon, Mic, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VoiceRecorder from './VoiceRecorder'
import ViewModeSelector from './ViewModeSelector'
import { generateUploadUrl } from '@/app/actions/chat-media'
import { supabase } from '@/lib/supabase'

type MediaType = 'image' | 'audio'
type ViewMode = 'once' | 'twice' | 'fulltime'

interface MediaUploaderProps {
  chatId: string
  currentUserId: string
  onMediaSent: (messageData: any) => void
  onCancel: () => void
}

export default function MediaUploader({ chatId, currentUserId, onMediaSent, onCancel }: MediaUploaderProps) {
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('fulltime')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setImageFile(file)
    setError(null)
    setMediaType('image') // FIX: Set mediaType to render preview state

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleVoiceRecordingComplete = async (blob: Blob, duration: number) => {
    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Generate unique filename and path
      const messageId = crypto.randomUUID()
      const filename = `voice-${messageId}.webm`
      const path = `chats/${chatId}/${currentUserId}/${filename}`

      // 1. Get signed upload URL from backend
      setUploadProgress(20)
      const uploadResult = await generateUploadUrl(path)
      
      if (!uploadResult.success || !uploadResult.signedUrl) {
        throw new Error(uploadResult.error || 'Failed to get upload URL')
      }

      // 2. Upload file directly from client to Supabase Storage via PUT request
      setUploadProgress(40)
      const uploadResponse = await fetch(uploadResult.signedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'audio/webm',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio binary directly to storage')
      }

      setUploadProgress(70)

      // 3. Insert the final structural row via Supabase Client
      const { data: messageData, error: insertError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          chat_id: chatId,
          sender_id: currentUserId,
          message_type: 'audio',
          content: caption || null,
          media_path: path,
          metadata: { duration, size: blob.size },
          status: 'sent',
          view_mode: viewMode,
          view_count: 0,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .single()

      if (insertError) throw insertError

      setUploadProgress(100)
      onMediaSent(messageData)
      onCancel()

    } catch (err: any) {
      console.error('[MediaUploader] Voice upload error:', err)
      setError(err.message || 'Failed to upload voice note')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleImageSend = async () => {
    if (!imageFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Generate unique filename and path
      const messageId = crypto.randomUUID()
      const fileExt = imageFile.name.split('.').pop()
      const filename = `image-${messageId}.${fileExt}`
      const path = `chats/${chatId}/${currentUserId}/${filename}`

      // 1. Get signed upload URL from backend
      setUploadProgress(20)
      const uploadResult = await generateUploadUrl(path)
      
      if (!uploadResult.success || !uploadResult.signedUrl) {
        throw new Error(uploadResult.error || 'Failed to get upload URL')
      }

      // 2. Upload file directly from client to Supabase Storage via PUT request
      setUploadProgress(40)
      const uploadResponse = await fetch(uploadResult.signedUrl, {
        method: 'PUT',
        body: imageFile,
        headers: {
          'Content-Type': imageFile.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image binary directly to storage')
      }

      setUploadProgress(60)

      // Get image dimensions
      const dimensions = await getImageDimensions(imageFile)

      setUploadProgress(80)

      // 3. Insert the final structural row via Supabase Client
      const { data: messageData, error: insertError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          chat_id: chatId,
          sender_id: currentUserId,
          message_type: 'image',
          content: caption || null,
          media_path: path,
          metadata: { 
            width: dimensions.width, 
            height: dimensions.height,
            size: imageFile.size,
            originalName: imageFile.name
          },
          status: 'sent',
          view_mode: viewMode,
          view_count: 0,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .single()

      if (insertError) throw insertError

      setUploadProgress(100)
      onMediaSent(messageData)
      onCancel()

    } catch (err: any) {
      console.error('[MediaUploader] Image upload error:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const reset = () => {
    setMediaType(null)
    setImageFile(null)
    setImagePreview(null)
    setCaption('')
    setError(null)
    setUploadProgress(0)
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  if (isUploading) {
    return (
      <div className="p-4 bg-secondary/50 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Uploading media...</p>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!mediaType) {
    return (
      <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-xl border border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full"
          title="Send image"
        >
          <ImageIcon className="w-5 h-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setMediaType('audio')}
          className="w-10 h-10 rounded-full"
          title="Record voice note"
        >
          <Mic className="w-5 h-5" />
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          className="w-8 h-8 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="space-y-3">
        <ViewModeSelector value={viewMode} onChange={setViewMode} />
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  if (mediaType === 'image' && imagePreview) {
    return (
      <div className="space-y-3 p-4 bg-secondary/50 rounded-xl border border-border">
        {/* View mode selector */}
        <ViewModeSelector value={viewMode} onChange={setViewMode} />

        {/* Image preview */}
        <div className="relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-full max-h-64 rounded-lg object-contain mx-auto"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={reset}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Caption input */}
        <input
          type="text"
          placeholder="Add a caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
          maxLength={500}
        />

        {/* Error message */}
        {error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImageSend}
            disabled={isUploading || !imageFile}
            className="flex-1 bg-accent hover:bg-accent/90"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </div>
    )
  }

  return null
}
