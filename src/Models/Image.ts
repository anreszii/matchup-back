import { getModelForClass, prop, ReturnModelType } from '@typegoose/typegoose'
import { Types } from 'mongoose'

export class Image {
  @prop({ required: true })
  display_url!: string
  @prop({ required: true })
  delete_url!: string

  static async erase(
    this: ReturnModelType<typeof Image>,
    ID?: Image | Types.ObjectId | string,
  ) {
    if (!ID) return false
    return this.findById(ID).then((document) => {
      if (!document) return false

      document.delete()
      return true
    })
  }
}

export const ImageModel = getModelForClass(Image)
