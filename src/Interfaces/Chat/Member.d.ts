import type { Chat } from './'

export interface IChatMember {
  name: string
  role?: Chat.userRole
}
