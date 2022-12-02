export function transformToRegExp(entity: unknown): any {
  if (!entity || typeof entity != 'object') return entity
  const result: { [key: string | number]: unknown } = {}
  for (let [path, prop] of Object.entries(entity)) {
    try {
      switch (typeof prop) {
        case 'object':
          result[path] = transformToRegExp(prop)
          break
        case 'string':
          if (path != '$regex') {
            result[path] = prop
            continue
          }
          result[path] = new RegExp(prop)
          break
        default:
          result[path] = prop
      }
      if (typeof prop == 'object') result[path] = transformToRegExp(prop)
      else if (typeof prop == 'string' && path.startsWith('$'))
        result[path] = new RegExp(prop)
    } catch {
      result[path] = prop
    }
  }
  return result
}
