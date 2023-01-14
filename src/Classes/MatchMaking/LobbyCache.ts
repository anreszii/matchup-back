import {
  DocumentType,
  ReturnModelType,
  getModelForClass,
  prop,
} from '@typegoose/typegoose'

export class CachedMember {
  @prop({ required: true })
  username!: string
  @prop({ required: true })
  nickname!: string
}

export class LobbyCache {
  @prop({ required: true })
  lobbyID!: string
  @prop({ required: true })
  owner!: string
  @prop({ required: true })
  map!: string
  @prop({ required: true, default: [], _id: false, type: () => CachedMember })
  cached!: CachedMember[]
  static async set(
    this: ReturnModelType<typeof LobbyCache>,
    id: string,
    owner: string,
    map: string,
    members: CachedMember[],
  ) {
    return this.get(id).then((document) => {
      if (!document) document = new this()
      document.lobbyID = id
      document.owner = owner
      document.map = map
      document.cached = members
      return document.save().then(() => document)
    })
  }
  async push(this: DocumentType<LobbyCache>, member: CachedMember) {
    this.cached.push(member)
    await this.save()
    return true
  }
  static async delete(this: ReturnModelType<typeof LobbyCache>, id: string) {
    return this.deleteOne({ lobbyID: id })
  }

  static async get(this: ReturnModelType<typeof LobbyCache>, id: string) {
    return this.findOne({ lobbyID: id })
  }
}

export const CachedLobbies = getModelForClass(LobbyCache)
