export function toBoolean(entity: unknown) {
  switch (typeof entity) {
    case 'string':
      return stb(entity)
    case 'number':
      return ntb(entity)
    default:
      return false
  }
}

function stb(entity: string) {
  if (entity.toLowerCase() === 'true') return true
  else if (entity.toLowerCase() === 'false') return false
  return false
}

function ntb(entity: number) {
  return Boolean(entity)
}
