const crypto = require('node:crypto')

/**
 * @param {String} password
 * @param {String} salt
 * @returns {{usedSalt: String, hash: String}}
 */
module.exports = function (password, salt = undefined) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex')
  return { usedSalt: salt, hash: crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('hex') }
}
