import { prop } from '@typegoose/typegoose'

import validator from 'validator'

export class Credentials {
  @prop({ required: [true, 'password required'] })
  password!: string
  @prop({
    required: [true, 'email required'],
    unique: true,
    validate: {
      validator: function (v: string) {
        if (v.startsWith('test_') && v.includes('@test')) return true
        return validator.isEmail(v)
      },
      message: () => `invalid email format`,
    },
  })
  email!: string
  @prop()
  region!: string
}
