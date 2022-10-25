import { DocumentType, prop, Ref, ReturnModelType } from '@typegoose/typegoose'
import { validationCause, ValidationError } from '../../error'
import { GuildModel, UserModel } from '../index'
import { RatingRecord as Record, RecordModel } from './Record'

type ratingType = 'user' | 'guild'
export class Leaderboard {
  @prop({ required: true })
  type!: ratingType
  @prop({ required: true, default: [], ref: () => Record })
  records!: Ref<Record>[]

  public async update(this: DocumentType<Leaderboard>) {
    switch (this.type) {
      case 'user': {
        await this._loadUserRecords()
        break
      }

      case 'guild': {
        await this._loadGuildRecords()
        break
      }

      default: {
        throw new ValidationError('leaderbord type', validationCause.INVALID)
      }
    }

    await this._validateRecords()
    await this._sortRecords()
    return this.save()
  }

  private async _loadUserRecords() {
    let names = []
    for (let user of await UserModel.find({}, 'profile.username'))
      names.push(user.profile.username)

    return this._createRecords(names).then((records) => {
      this.records = records as unknown[] as Record[]
    })
  }

  private async _loadGuildRecords() {
    let names = []
    for (let user of await UserModel.find({}, 'profile.username'))
      names.push(user.profile.username)

    return names
  }

  private async _createRecords(owners: string[]) {
    let promises: Promise<unknown>[] = []
    switch (this.type) {
      case 'user': {
        for (let owner of owners) promises.push(this._createUserRecord(owner))
        break
      }

      case 'guild': {
        for (let owner of owners) promises.push(this._createGuildRecord(owner))
        break
      }

      default:
        throw new ValidationError('leaderboard type', validationCause.INVALID)
    }

    return Promise.all(promises).then((records) => {
      return records
    })
  }

  private _createUserRecord(user: string) {
    return UserModel.findByName(user).then((user) => {
      if (!user) throw new ValidationError('guild', validationCause.NOT_EXIST)
      return RecordModel.create({ owner: user.profile.username, rpr: user.GRI })
    })
  }

  private _createGuildRecord(guild: string) {
    return GuildModel.findByName(guild).then((guild) => {
      if (!guild) throw new ValidationError('guild', validationCause.NOT_EXIST)
    })
  }

  private _sortRecords(this: DocumentType<Leaderboard>) {
    return this._validateRecords().then(() => {
      if (this.records.length < 2) return
      const middle = this.records.length / 2
      const leftPart = this.records.splice(0, middle)

      const sortedRecords = this._merge(
        leftPart as Record[],
        this.records as Record[],
      )

      this.records = sortedRecords
      return this.save()
    })
  }

  private _merge(left: Record[], right: Record[]) {
    let result = []
    while (left.length && right.length) {
      let smaller = left[0].mpr > right[0].mpr ? left[0] : right[0]
      result.push(smaller)
    }

    return [...result, ...left, ...right]
  }

  private async _validateRecords() {
    for (let [id, record] of this.records.entries()) {
      if (!record) {
        this.records.splice(id, 1)
        continue
      }
      if (record instanceof Record) continue

      let document = await RecordModel.findById(record)
      if (!document) {
        this.records.splice(id, 1)
        continue
      }

      this.records[id] = document
    }
  }
}
