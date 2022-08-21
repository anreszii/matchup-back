import { pbkdf2Sync } from 'node:crypto'
require('dotenv').config()

export function generateHash(password: string) {
  return pbkdf2Sync(password, process.env.SALT!, 10000, 512, 'sha512').toString(
    'hex',
  )
}
