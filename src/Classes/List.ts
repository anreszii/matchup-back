/**
 * Простой класс листа, который содержит объекты одного типа
 * @template {Object}T тип хранимых объектов
 */
export class List<T extends Object> {
  /** Массив внутренних элементов, которые доступны только наследникам */
  protected _elements: Array<T | undefined> = new Array()
  /**
   * Специальное значение, которое используется для определения свободных мест внутри массива
   * в случае, если будет указан настраеваемый undefined, TurboFan сможет сделать дополнительные оптимизации
   */
  protected _undefined: undefined | T

  /**
   * Задает массиву начальный размер и запаолняет его {@link List._undefined | 'List._undefined'}
   */
  constructor(arraySize?: number, undefinedValue?: T) {
    if (undefinedValue) this._undefined = undefinedValue
    if (arraySize) this._elements = new Array(arraySize).fill(this._undefined)
  }

  /** Генератор значений элементов. Возвращает любые значения, которые не равны {@link List._undefined | 'List._undefined'} */
  public *values() {
    let index = 0
    while (index < this._elements.length) {
      if (this._elements[index] != this._undefined)
        yield this._elements[index++]
      else index++
    }
  }

  /**
   * Добавляет набор новых элемментов типа T.
   * @return false, если один из элементов оказался {@link List._undefined} и добавляет остальные элементы. true в остальных случаях
   */
  public add(...elements: Array<T>) {
    let status = true
    for (let element of elements.values()) {
      if (element == this._undefined) status = false
      this._elements[this._freeSpace] = element
    }
    return status
  }

  /**
   * Добавляет набор новых элемментов типа T.
   * @returns false, если один из элементов оказался {@link List._undefined} или он не был найдет в {@link List._elements} и удаляет остальные элементы. true в остальных случаях
   */
  public delete(...elements: Array<T>) {
    let status = true
    for (let element of elements.values()) {
      if (element == this._undefined) status = false

      let index = this._getElement(element)
      if (!~index) status = false

      this._elements[index] = this._undefined
    }
    return status
  }

  /**
   * @returns true, если внутри {@link List._elements} есть хотя бы один элемент вида {@link List._undefined}
   */
  protected get _hasFreeSpace() {
    return this._elements.includes(this._undefined)
  }

  /**
   * @returns свободная позиция внутри массива.
   */
  protected get _freeSpace(): number {
    if (!this._hasFreeSpace) return this._elements.length
    return this._elements.indexOf(this._undefined)
  }

  /**
   *
   * @param объект, который нужно найти
   * @returns индекс найденного объекта или -1
   */
  protected _getElement(element: T) {
    for (let i = 0; i < this._elements.length; i++) {
      if (this._elements[i] == element) return i
    }
    return -1
  }
}
