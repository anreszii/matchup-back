import { prop } from '@typegoose/typegoose'

export class MapScore {
  @prop()
  mapName?: string
  @prop({ required: true })
  command1!: number
  @prop({ required: true })
  command2!: number
}
