# Rich Media Chat with Expiration Tiers - Implementation Guide

This document provides a comprehensive guide for implementing the WhatsApp-like media expiration feature in your LEA application.

## Overview

The rich media chat feature supports:
- **Text messages** with no expiration
- **Image messages** with view-once, view-twice, or full-time expiration
- **Voice notes** with view-once, view-twice, or full-time expiration
- **Real-time synchronization** of message status changes
- **Secure storage** using Supabase private buckets with signed URLs
- **Automatic expiration** based on view count

## Architecture

### Database Schema

The `messages` table has been extended with the following columns:

- `message_type`: 'text', 'image', or 'audio'
- `content`: Text content or media captions
- `media_path`: Storage path for media files
- `metadata`: JSONB with image dimensions, audio duration, file size
- `status`: 'sent', 'deleted', or 'expired'
- `view_mode`: 'once', 'twice', or 'fulltime'
- `view_count`: Number of times media has been viewed

### Server Actions

Located in `app/actions/chat-media.ts`:

1. **`generateUploadUrl(path: string)`**
   - Creates a 60-second signed upload URL
   - Used for uploading media to private storage

2. **`getMediaDeliveryUrl(messageId: string)`**
   - Creates a 30-second signed download URL
   - Validates user permissions (sender or recipient only)
   - Checks if media has expired

3. **`trackMediaView(messageId: string)`**
   - Increments view count for recipient views
   - Automatically expires media based on view_mode
   - Clears media_path when expired
   - Deletes file from storage when expired

4. **`uploadMediaFile(file, path, contentType)`**
   - Uploads file to Supabase storage
   - Accepts both File and Blob types

### Frontend Components

#### 1. VoiceRecorder (`components/chat/VoiceRecorder.tsx`)
- Uses browser's native MediaRecorder API
- Records audio in webm format
- Provides visual recording timer
- Supports playback preview before sending

#### 2. ViewModeSelector (`components/chat/ViewModeSelector.tsx`)
- UI toggle for selecting expiration mode
- Options: View Once, View Twice, Keep Forever
- Clean, accessible button interface

#### 3. ChatBubble (`components/chat/ChatBubble.tsx`)
- Renders messages based on type and status
- Handles expired/deleted states
- Implements view tracking for ephemeral media
- Shows full-screen modal for view-once images
- Custom audio player for voice notes

#### 4. MediaUploader (`components/chat/MediaUploader.tsx`)
- Orchestrates the media upload pipeline
- Handles image selection and preview
- Integrates with VoiceRecorder
- Shows upload progress
- Validates file size and type

#### 5. RichMediaChat (`components/chat/RichMediaChat.tsx`)
- Complete chat interface component
- Integrates all sub-components
- Real-time message synchronization
- Auto-scroll to new messages

#### 6. useRealtimeMessages (`hooks/useRealtimeMessages.ts`)
- Custom hook for real-time message sync
- Subscribes to INSERT, UPDATE, DELETE events
- Automatically updates local state
- Fetches sender information

## Setup Instructions

### 1. Database Migration

Run the SQL migration in `lib/database/chat_media_schema.sql` in your Supabase SQL Editor:

```sql
-- Copy the entire contents of lib/database/chat_media_schema.sql
-- and run it in Supabase Dashboard > SQL Editor
```

This will:
- Add new columns to the messages table
- Create indexes for performance
- Set up RLS policies
- Create expiration trigger

### 2. Create Storage Bucket

In Supabase Dashboard:

1. Go to **Storage**
2. Click **New bucket**
3. Name it: `chat-media`
4. Make it **Private** (not public)
5. Click **Create bucket**

### 3. Configure Environment Variables

Ensure these are set in your `.env.local` and Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Enable Realtime

In Supabase Dashboard:

1. Go to **Database** > **Replication**
2. Enable replication for the `messages` table
3. Select `INSERT`, `UPDATE`, `DELETE` events

## Usage Examples

### Basic Chat Integration

```tsx
import RichMediaChat from '@/components/chat/RichMediaChat'

export default function ChatPage() {
  const { data: { user } } = await supabase.auth.getUser()
  const chatId = 'your-chat-id'

  return (
    <RichMediaChat
      chatId={chatId}
      currentUserId={user.id}
    />
  )
}
```

### Sending Text Messages

The RichMediaChat component handles text messages automatically. Users can type and send messages through the input field.

### Sending Images

1. Click the attachment icon (paperclip)
2. Select "Send image"
3. Choose an image file
4. Select view mode (once, twice, or fulltime)
5. Add optional caption
6. Click "Send"

### Sending Voice Notes

1. Click the attachment icon (paperclip)
2. Select "Record voice note"
3. Click the microphone icon to start recording
4. Click again to stop recording
5. Preview the recording
6. Select view mode (once, twice, or fulltime)
7. Click send to upload

### Viewing Ephemeral Media

**For Images:**
- Click on the image to view it
- Modal opens and view is tracked immediately
- After closing, media may expire based on view_mode
- Expired images show "Opened" with lock icon

**For Voice Notes:**
- Click play button to start playback
- View is tracked when playback starts
- After playback ends, media may expire
- Expired voice notes show "Played Voice Note" with lock icon

## Security Considerations

1. **Signed URLs**: All media access uses time-limited signed URLs (30 seconds)
2. **Permission Checks**: Only sender or recipient can access media
3. **Private Storage**: Media stored in private bucket, not publicly accessible
4. **RLS Policies**: Database has row-level security enabled
5. **Automatic Cleanup**: Media files deleted from storage when expired

## Troubleshooting

### Media not loading
- Check that `chat-media` bucket exists and is private
- Verify RLS policies are correctly configured
- Ensure user is authenticated
- Check browser console for errors

### Real-time not working
- Verify Realtime is enabled for messages table
- Check that replication is enabled in Supabase
- Ensure chatId is correct
- Check browser console for connection status

### View tracking not working
- Verify `trackMediaView` server action is working
- Check that user is recipient (not sender)
- Ensure message status is not already expired
- Check browser console for errors

### Upload failing
- Check that signed upload URLs are being generated
- Verify file size is under 10MB limit
- Ensure bucket has sufficient storage
- Check Supabase logs for upload errors

## File Structure

```
app/
  actions/
    chat-media.ts          # Server actions for media operations
components/
  chat/
    ChatBubble.tsx         # Message bubble with expiration logic
    MediaUploader.tsx      # Media upload orchestration
    RichMediaChat.tsx      # Complete chat interface
    ViewModeSelector.tsx   # View mode toggle
    VoiceRecorder.tsx      # Voice recording component
hooks/
  useRealtimeMessages.ts   # Real-time message sync hook
lib/
  database/
    chat_media_schema.sql  # Database migration
```

## Performance Considerations

1. **Indexes**: Database indexes on chat_id, sender_id, status, and view_mode
2. **Lazy Loading**: Media only loaded when needed
3. **Signed URL Caching**: URLs cached for 30 seconds to reduce API calls
4. **Real-time Throttling**: Supabase handles connection management
5. **Storage Cleanup**: Automatic deletion of expired files

## Future Enhancements

Potential improvements:
- Video message support
- Document sharing
- Message reactions
- Message forwarding
- Message quoting
- End-to-end encryption
- Message read receipts
- Typing indicators
- Online status
- Message search
