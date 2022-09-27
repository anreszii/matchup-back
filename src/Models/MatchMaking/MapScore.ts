import { prop } from '@typegoose/typegoose'

export class MapScore {
  @prop({ required: true })
  mapName!: string
  @prop({ required: true })
  command1!: number
  @prop({ required: true })
  command2!: number
}
