import { getModelForClass, prop } from '@typegoose/typegoose'

export class Image {
  @prop({ required: true })
  display_url!: string
  @prop({ required: true })
  delete_url!: string
}

export const ImageModel = getModelForClass(Image)
