import { prop } from '@typegoose/typegoose'

import validator from 'validator'

export class Credentials {
  @prop({ required: [true, 'password required'], default: '' })
  password!: string
  @prop({
    required: [true, 'email required'],
    unique: true,
    validate: {
      validator: function (v: string) {
        return validator.isEmail(v)
      },
      message: () => `invalid email format`,
    },
  })
  email!: string
  @prop({ required: [true, 'region required'] })
  region!: string
}
