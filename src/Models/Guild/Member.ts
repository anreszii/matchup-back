import { prop, DocumentType } from '@typegoose/typegoose'

export type orders =
  | 'addMember'
  | 'removeMember'
  | 'leave'
  | 'changeName'
  | 'changeTag'

export type roles = 'owner' | 'moderator' | 'member'
export class Member {
  @prop({ required: true })
  name!: string
  @prop({ required: true })
  role!: roles

  public hasRightToExecute(order: orders) {
    switch (this.role) {
      case 'owner':
        return Owner.hasRightToExecute(order)
      case 'moderator':
        return Moderator.hasRightToExecute(order)
      case 'member':
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
