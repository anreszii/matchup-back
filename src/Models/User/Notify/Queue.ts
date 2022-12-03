import type { Types } from 'mongoose'
import { DocumentType, prop, Ref, ReturnModelType } from '@typegoose/typegoose'

import { Notify } from './Notify'

import { User } from '../User'
import { UserModel } from '../../index'

import { TechnicalCause, TechnicalError } from '../../../error'

export class NotificationQueue {
  @prop({ required: true, ref: () => User })
  owner!: Ref<User>
  @prop({ required: true, type: () => Notify, default: [], _id: false })
  notifications!: Notify[]

  static async getForUser(
    this: ReturnModelType<typeof NotificationQueue>,
    user: User | Types.ObjectId | string,
  ) {
    let userDocument: DocumentType<User> | null
    if (typeof user == 'string')
      userDocument = await UserModel.findByName(user)!
    else userDocument = await UserModel.findById(user)!
    if (!userDocument)
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    const owner = userDocument._id
    let existedDocument = await this.findOne({ owner })
    if (existedDocument) return existedDocument
    return this.create({ owner })
  }

  async push(this: DocumentType<NotificationQueue>, content: string) {
    this.notifications.push(new Notify(content))
    await this.save()
    return this.notifications[this.notifications.length - 1]
  }

  async shift(this: DocumentType<NotificationQueue>) {
    return this.notifications[this.notifications.length - 1]
  }

  async readOne(this: DocumentType<NotificationQueue>, id: string) {
    let notify = this.notifications.find((notify) => notify.info.id == id)
    if (!notify) throw new TechnicalError('notify', TechnicalCause.NOT_EXIST)

    notify.info.readed = true
    await this.save()
    return notify
  }

  async readAll(this: DocumentType<NotificationQueue>) {
    for (let i = 0; i < this.notifications.length; i++)
      this.notifications[i].info.readed = true
    await this.save()
    return this.notifications
  }

  async getUnreaded(this: DocumentType<NotificationQueue>) {
    let unreaded = []
    for (let i = 0; i < this.notifications.length; i++)
      if (!this.notifications[i].info.readed)
        unreaded.push(this.notifications[i])

    return unreaded
  }

  async deleteNotify(this: DocumentType<NotificationQueue>, id: string) {
    let notifyIndex = this.notifications.findIndex(
      (notify) => notify.info.id == id,
    )
    if (!~notifyIndex)
      throw new TechnicalError('notify', TechnicalCause.NOT_EXIST)

    this.notifications.splice(notifyIndex, 1)
    await this.save()
    return this.notifications[notifyIndex]
  }

  async erase(this: DocumentType<NotificationQueue>) {
    let notifications = Array.from(this.notifications)
    this.notifications = []
    await this.save()

    return notifications
  }
}
