import { IEntity, IManager } from '../Interfaces'

class ALManager implements IManager<AliasMap, string> {
  private _aliasMaps: Map<string, AliasMap> = new Map()
  spawn(namespace: string): AliasMap {
    if (this._aliasMaps.has(namespace)) return this._aliasMaps.get(namespace)!

    let newMap = new AliasMap(namespace)
    this._aliasMaps.set(namespace, newMap)

    return newMap
  }

  drop(namespace: string): boolean {
    return this._aliasMaps.delete(namespace)
  }

  get(namespace: string) {
    return this.spawn(namespace)
  }

  has(namespace: string): boolean {
    return this._aliasMaps.has(namespace)
  }
}

/**
 * Класс, хранящий пары username | socketID[]<br>
 * Используется временно, до момента устранения ошибок UX в gamesocket.io
 */
export class AliasMap implements IEntity<string> {
  private _map: Map<string, Array<string>> = new Map()
  constructor(private _id: string) {}
  public get id() {
    return this._id
  }

  set(username: string, socketID: string) {
    if (this._map.has(username)) return this._map.set(username, [socketID])

    return this._map.get(username)!.push(socketID)
  }

  delete(username: string, socketID: string) {
    if (this._map.has(username)) return false
    let tmpNames = this._map.get(username)!

    tmpNames.splice(tmpNames.indexOf(socketID), 1)
    return true
  }

  drop(username: string) {
    return this._map.delete(username)
  }

  get(username: string) {
    return this._map.get(username)
  }

  has(username: string) {
    return this._map.has(username)
  }
}

const Aliases = new ALManager()
export default Aliases
