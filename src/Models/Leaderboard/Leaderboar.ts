import { DocumentType, prop } from '@typegoose/typegoose'
import { TechnicalCause, TechnicalError } from '../../error'

import { GuildModel, UserModel } from '../index'
import { RatingRecord as Record } from './Record'

type ratingType = 'user' | 'guild'

export class Leaderboard {
  @prop({ required: true })
  type!: ratingType
  @prop({ required: true, default: [], type: () => Record, _id: false })
  records!: Record[]

  /**
   * Обновляет список записей, исходя из типа рейтинговой таблицы.
   * К примеру, будет получать все записи пользователей из бд и потом на их основе сделает глобальную таблицу лидеров с учетом всех записей.
   *
   * Формат записи:
   * ```typescript
   * type Record = {
   *   owner: string
   *   ratingPoints: number
   * }
   * ```
   *
   */
  public async update(this: DocumentType<Leaderboard>) {
    await this._updateRecords()
    this._deleteUndefinedRecords()
    this._sortRecords()
    return this.save()
  }

  private async _updateRecords() {
    const records = await this._createNewRecords()
    this.records = records
  }

  /**
   * Метод получает в зависимости от типа таблицы необходимые данные из других таблиц и затем преобразует их в записи формата:
   * ```typescript
   * type Record = {
   *   owner: string
   *   ratingPoints: number
   * }
   * ```
   *
   * @returns неотсортированный массив Record
   */
  private _createNewRecords() {
    switch (this.type) {
      case 'user':
        return this._createUserRecords()

      case 'guild':
        return this._createGuildRecords()

      default:
        throw new TechnicalError('leaderboard type', TechnicalCause.INVALID)
    }
  }

  /**
   * @return неотсортированный массив Records для пользовательской модели
   */
  private async _createUserRecords() {
    let records: Record[] = []
    const users = await UserModel.find({}, 'profile raging')
    for (let user of users)
      records.push(this._createRecord(user.profile.username, user.GRI))
    return records
  }

  /**
   * @returns неотсортированный массив Records для модели гильдий
   */
  private async _createGuildRecords() {
    let records: Record[] = []
    const guilds = await GuildModel.find({}, 'info')
    for (let guild of guilds)
      records.push(this._createRecord(guild.public.name, guild.public.GRI))
    return records
  }

  /**
   * Вспомогательная функция для удобного создания записи
   * @param owner: имя сущности, которой принадлежит рейтинг
   * @param ratingPoints: количество очков рейтинга
   * @returns запись формата
   * ```typescript
   * type Record = {
   *   owner: string
   *   ratingPoints: number
   * }
   * ```
   */
  private _createRecord(owner: string, ratingPoints: number) {
    let record = new Record()

    record.owner = owner
    record.ratingPoints = ratingPoints

    return record
  }

  /** Сортировка слиянием, в ходе которой все записи с наивысшем показателем рейтинга окажутся впереди. */
  private _sortRecords(this: DocumentType<Leaderboard>) {
    if (this.records.length < 2) return
    const middle = this.records.length / 2
    const leftPart = this.records.splice(0, middle)

    const sortedRecords = this._merge(
      leftPart as Record[],
      this.records as Record[],
    )

    this.records = sortedRecords as Record[]
  }

  private _merge(left: Record[], right: Record[]) {
    let result = []
    while (left.length && right.length) {
      let highest =
        left[0].ratingPoints > right[0].ratingPoints
          ? left.shift()
          : right.shift()
      result.push(highest)
    }

    return [...result, ...left, ...right]
  }

  /** Удаляет записи, значение которых не определено */
  private _deleteUndefinedRecords() {
    for (let [id, record] of this.records.entries())
      if (!record) this.records.splice(id, 1)
  }
}
