import crypto from 'node:crypto'

export function generateHash(password: string, salt?: string) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex')
  return { usedSalt: salt, hash: crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex') }
}
