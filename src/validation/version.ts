import { CURRENT_API_VERSION } from '../configs/version'

export function validateVersion(version: unknown): boolean {
  if (typeof version != 'string') return false
  let versionArr = version.split('.')
  if (CURRENT_API_VERSION.major != parseInt(versionArr[0])) return false
  if (CURRENT_API_VERSION.minor > parseInt(versionArr[1])) return false
  return true
}
