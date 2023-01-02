type CachedMember = {
  username: string
  nickname: string
}

interface Cache {
  set(id: string, members: CachedMember[]): boolean
  push(id: string, member: CachedMember): boolean
  delete(id: string): boolean
  get(id: string): CachedMember[] | undefined
}

class LobbyCache implements Cache {
  private _cached: Map<string, CachedMember[]> = new Map()

  set(id: string, members: CachedMember[]): boolean {
    this._cached.set(id, members)
    return true
  }
  push(id: string, member: CachedMember): boolean {
    if (!this._cached.has(id)) return this.set(id, [member])
    this._cached.get(id)!.push(member)
    return true
  }
  delete(id: string) {
    return this._cached.delete(id)
  }

  get(id: string): CachedMember[] | undefined {
    return this._cached.get(id)
  }
}

export const CachedLobbies = new LobbyCache()
