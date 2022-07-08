const crypto = require('node:crypto')

module.exports = function (password, salt = undefined) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex')
  return { salt: salt, hash: crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex') }
}
