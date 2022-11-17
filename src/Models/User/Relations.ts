import { prop } from '@typegoose/typegoose'

export class Relations {
  @prop({ type: () => String, required: true, default: [] })
  public friends!: string[]
  @prop({ type: () => String, required: true, default: [] })
  public subscribers!: string[]
}

export class RelationRecord {
  constructor(public name: string, public avatar: string | undefined) {}
}
