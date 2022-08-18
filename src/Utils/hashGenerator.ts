import crypto from 'node:crypto'

export function generateHash(password: string) {
  return crypto
    .pbkdf2Sync(password, process.env.SALT, 10000, 512, 'sha512')
    .toString('hex')
}
