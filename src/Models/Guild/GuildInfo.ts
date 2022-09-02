import { prop } from '@typegoose/typegoose'

export class Info {
  @prop({
    required: true,
    unique: true,
    validate: {
      validator: function (v: string) {
        let length = v.length
        return length >= 6 && length <= 18
      },
      message: () => `invalid guild name format`,
    },
  })
  name!: string
  @prop({
    required: true,
    unique: true,
    validate: {
      validator: function (v: string) {
        let length = v.length
        return length >= 3 && length <= 4
      },
      message: () => `invalid tag format`,
    },
  })
  tag!: string
}
