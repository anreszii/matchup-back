import { prop, DocumentType, Ref } from '@typegoose/typegoose'
import { User } from '../index'

export type orders =
  | 'addMember'
  | 'removeMember'
  | 'leave'
  | 'changeName'
  | 'changeTag'
  | 'changeRole'

export const enum roles {
  owner = 2,
  moderator = 1,
  member = 0,
}
export class Member {
  @prop({ required: true })
  name!: string
  @prop({ required: true, ref: () => User })
  id!: Ref<User>
  @prop({ required: true })
  role!: roles

  public hasRightToExecute(order: orders) {
    switch (this.role) {
      case roles.owner:
        return Owner.hasRightToExecute(order)
      case roles.moderator:
        return Moderator.hasRightToExecute(order)
      case roles.moderator:
        return Default.hasRightToExecute(order)
    }
  }
}

abstract class Role {
  static hasRightToExecute(order: orders) {}
}

class Owner implements Role {
  public static hasRightToExecute(order: orders) {
    return true
  }
}

class Moderator implements Role {
  public static hasRightToExecute(order: orders) {
    switch (order) {
      case 'addMember':
        return true
      case 'leave':
        return true
      default:
        return false
    }
  }
}

class Default implements Role {
  public static hasRightToExecute(order: orders) {
    switch (order) {
      case 'leave':
        return true
      default:
        return false
    }
  }
}
