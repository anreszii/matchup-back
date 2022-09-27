import { getModelForClass, prop } from '@typegoose/typegoose'
import { Types } from 'mongoose'

export class Image {
  @prop({ required: true })
  public buffer!: Types.Buffer
  @prop({ required: true })
  public contentType!: string
}

export const ImageModel = getModelForClass(Image)
