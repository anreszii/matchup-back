import type { Chat } from './index.js'

export interface IChatMember {
  name: string
  role: Chat.userRole
}
