/** Maximum age of a message (ms) before "delete for everyone" is rejected. */
export const DELETE_FOR_EVERYONE_WINDOW_MS = 24 * 60 * 60 * 1000

export const DELETED_MESSAGE_PLACEHOLDER = 'This message was deleted'

export const MESSAGE_DELETED_BROADCAST_EVENT = 'message_deleted'

export type MessageStatus = 'sent' | 'deleted'

export interface MessageDeletedBroadcastPayload {
  message_id: string
  chat_id: string
  status: 'deleted'
}
