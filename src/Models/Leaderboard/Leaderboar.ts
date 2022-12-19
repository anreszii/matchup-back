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
  async updateLeaderboard(this: DocumentType<Leaderboard>) {
    await this._updateRecords()
    this._deleteUndefinedRecords()
    this._sortRecords()
    await this.save()
    return true
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
    const users = await UserModel.find({}, 'profile rating')
    for (let user of users)
      records.push(
        this._createRecord(
          user.profile.username,
          user.GRI,
          user.profile.avatar,
        ),
      )
    return records
  }

  /**
   * @returns неотсортированный массив Records для модели гильдий
   */
  private async _createGuildRecords() {
    let records: Record[] = []
    const guilds = await GuildModel.find({}, 'public')
    for (let guild of guilds)
      records.push(
        this._createRecord(
          guild.public.name,
          guild.public.GRI,
          guild.public.profileImage,
        ),
      )
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
  private _createRecord(name: string, ratingPoints: number, image?: string) {
    let record = new Record()

    record.name = name
    record.ratingPoints = ratingPoints
    if (image) record.image = image

    return record
  }

  /** Сортировка слиянием, в ходе которой все записи с наивысшем показателем рейтинга окажутся впереди. */
  private _sortRecords(this: DocumentType<Leaderboard>) {
    this.records = this._mergeSort(this.records)
  }

  private _mergeSort(records: Record[]): Record[] {
    if (records.length < 2) return records
    const middle = records.length / 2
    const leftPart = records.splice(0, middle)

    return this._merge(this._mergeSort(leftPart), this._mergeSort(records))
  }

  private _merge(left: Record[], right: Record[]): Record[] {
    let result = []
    while (left.length && right.length) {
      if (left[0].ratingPoints > right[0].ratingPoints)
        result.push(left.shift() as Record)
      else result.push(right.shift() as Record)
    }

    return [...result, ...left, ...right]
  }

  /** Удаляет записи, значение которых не определено */
  private _deleteUndefinedRecords() {
    for (let [id, record] of this.records.entries())
      if (!record) this.records.splice(id, 1)
  }
}
