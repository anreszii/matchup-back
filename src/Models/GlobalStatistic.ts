import {
  prop,
  getModelForClass,
  Ref,
  ReturnModelType,
  DocumentType,
} from '@typegoose/typegoose'

class DBStatistic {
  @prop({ required: true })
  public main!: boolean
  @prop({ required: true })
  public lastUpdate!: Date
  @prop({ required: true, default: 0 })
  public newPrivilegedCounter!: number
  @prop({ required: true, default: 0 })
  public newUserCounter!: number

  public async increasePrivilegedCounter(this: DocumentType<DBStatistic>) {
    this.newPrivilegedCounter++
    return this.save()
  }

  public async increaseUserCounter(this: DocumentType<DBStatistic>) {
    this.newUserCounter++
    return this.save()
  }
}

const StatisticModel = getModelForClass(DBStatistic)

/**
 * Ультракостыльное решение, которое создает один элемент, если его не существует или подключает единственный в бд и манипулирует им.
 * Если будете знать способ, как создать статичный объект в Mongo не теряя в производительности/качестве кода - перепешите классы пожалуйста
 */
export class globalStatistic {
  private static _controlElement: DocumentType<DBStatistic>

  public static async init() {
    let element = StatisticModel.find({ main: true })
    if (!element)
      return (globalStatistic._controlElement = await StatisticModel.create({
        main: true,
        lastUpdate: Date.now(),
      }))
    return (globalStatistic._controlElement = (await StatisticModel.findOne({
      main: true,
    })) as DocumentType<DBStatistic>)
  }

  public static async increasePrivilegedCounter() {
    return this._controlElement.increasePrivilegedCounter()
  }

  public static async increaseUserCounter() {
    return this._controlElement.increaseUserCounter()
  }

  public static get isReadyToExecute() {
    return this._controlElement != undefined
  }

  public static get privilegedCounter(): number {
    return this._controlElement.newPrivilegedCounter
  }

  public static get userCounter(): number {
    return this._controlElement.newUserCounter
  }
}
