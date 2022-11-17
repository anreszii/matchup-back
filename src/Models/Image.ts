import { getModelForClass, prop } from '@typegoose/typegoose'

export class Image {
  @prop({ required: true })
  buffer!: Buffer
  @prop({ required: true })
  mimeType!: string
}

export const ImageModel = getModelForClass(Image)
