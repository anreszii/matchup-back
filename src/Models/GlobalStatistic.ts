import {
  prop,
  getModelForClass,
  ReturnModelType,
  DocumentType,
} from '@typegoose/typegoose'

class DBMonthStatistic {
  @prop({ required: true })
  public main!: boolean
  @prop({ required: true })
  public lastUpdateMonth!: number //Число от 1 до 12
  @prop({ required: true, default: 0 })
  public newPrivilegedCounter!: number
  @prop({ required: true, default: 0 })
  public newUserCounter!: number

  public async increasePrivilegedCounter(this: DocumentType<DBMonthStatistic>) {
    this.newPrivilegedCounter++
    return this.save()
  }

  public async increaseUserCounter(this: DocumentType<DBMonthStatistic>) {
    this.newUserCounter++
    return this.save()
  }

  public async wipeData(this: DocumentType<DBMonthStatistic>) {
    this.newPrivilegedCounter = 0
    this.newUserCounter = 0
    this.lastUpdateMonth = new Date().getMonth() + 1
    return this.save()
  }

  public static async getControlElement(
    this: ReturnModelType<typeof DBMonthStatistic>,
  ) {
    let controlElement = await this.findOne({ main: true })
    if (!controlElement)
      return this.create({
        main: true,
        lastUpdate: new Date().getMonth() + 1,
      })

    return controlElement
  }
}

const MonthStatisticModel = getModelForClass(DBMonthStatistic)

/**
 * Ультракостыльное решение, которое создает один элемент, если его не существует или подключает единственный в бд и манипулирует им.
 * Если будете знать способ, как создать статичный объект в Mongo не теряя в производительности/качестве кода - перепешите классы пожалуйста
 */
export class GlobalStatistic {
  private static _controlMonthStatistic: DocumentType<DBMonthStatistic>

  /**
   * Функция, которая обновляет всю статистику. Перед использованием любой из публичных функций следует вызывать ее.
   */
  public static async update() {
    await this._updateControlElements()
    await this._updateMonthStatistic()
  }

  public static async increasePrivilegedCounter() {
    return this._controlMonthStatistic.increasePrivilegedCounter()
  }

  public static async increaseUserCounter() {
    return this._controlMonthStatistic.increaseUserCounter()
  }

  public static get isReadyToExecute() {
    return this._controlMonthStatistic != undefined
  }

  public static get privilegedCounter(): number {
    return this._controlMonthStatistic.newPrivilegedCounter
  }

  public static get userCounter(): number {
    return this._controlMonthStatistic.newUserCounter
  }

  private static async _updateControlElements() {
    if (!this._controlMonthStatistic)
      this._controlMonthStatistic =
        await MonthStatisticModel.getControlElement()
  }

  private static async _updateMonthStatistic() {
    if (
      this._controlMonthStatistic.lastUpdateMonth !=
      new Date().getMonth() + 1
    )
      this._controlMonthStatistic.wipeData()
    return
  }
}
