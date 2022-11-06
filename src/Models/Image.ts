import { getModelForClass, prop } from '@typegoose/typegoose'
import { Types } from 'mongoose'

export class Image {
  @prop({ required: true })
  public buffer!: Buffer
  @prop({ required: true })
  public mimeType!: string
}

export const ImageModel = getModelForClass(Image)
