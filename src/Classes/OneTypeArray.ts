/**
 * Простой класс массива, который содержит объекты одного типа
 * @template {Object}T тип хранимых объектов
 */
export class OneTypeArray<T extends Object> {
  /** Массив внутренних элементов, которые доступны только наследникам */
  protected _elements: Array<T | undefined> = new Array()
  /**
   * Специальное значение, которое используется для определения свободных мест внутри массива
   * в случае, если будет указан настраеваемый undefined, движок V8 сможет сделать дополнительные оптимизации
   */
  protected _undefined: undefined | T

  /**
   * Задает массиву начальный размер и запаолняет его {@link OneTypeArray._undefined | 'List._undefined'}
   */
  constructor(arraySize?: number, undefinedValue?: T) {
    if (undefinedValue) this._undefined = undefinedValue
    if (arraySize) this._elements = new Array(arraySize).fill(this._undefined)
  }

  /** Генератор значений элементов. Возвращает любые значения, которые не равны {@link OneTypeArray._undefined | 'List._undefined'} */
  public *values(): Generator<T> {
    let index = 0
    while (index < this._elements.length) {
      if (this._elements[index] != this._undefined)
        yield this._elements[index++] as T
      else index++
    }
  }

  /** Возвращает массив всех значений, которые не равны {@link OneTypeArray._undefined} */
  public get toArray(): T[] {
    let tmp: Array<T> = []
    for (let index = 0; index < this._elements.length; index++)
      if (this._elements[index] != this._undefined)
        tmp.push(this._elements[index] as T)

    return tmp
  }

  /**
   * Добавляет набор новых элементов типа T.
   * @return количество добавленных элементов
   */
  public add(...elements: Array<T>) {
    let counter = 0

    for (let index = 0; index < elements.length; index++) {
      if (!elements[index] || elements[index] == this._undefined) continue

      this._elements[this.freeSpace] = elements[index]
      counter++
    }
    return counter
  }

  /**
   * Добавляет элемент типа T.
   * @return -1, если элемент оказался {@link OneTypeArray._undefined} или index вставленного объекта в случае успеха.
   */
  public addOne(element: T) {
    if (element == this._undefined) return -1

    let index = this.freeSpace
    this._elements[index] = element

    return index
  }

  /**
   * Удаляет набор элемментов типа T.
   * @returns количество удаленных элементов
   */
  public delete(...elements: Array<T>) {
    let counter = 0
    for (let index = 0; index < elements.length; index++) {
      if (!elements[index] || elements[index] == this._undefined) continue

      let tmp: number
      while (~(tmp = this._getElement(elements[index]))) {
        this._elements[tmp] = this._undefined
        counter++
      }
    }
    return counter
  }

  /**
   * Удаляет один указанный элемент
   *
   * @param element элемент, которое нужно удалить
   * @returns индекс удаленного элемента или -1, если его не существовало
   */
  public deleteOne(element: T) {
    let index = this._elements.indexOf(element)
    if (!~index) return -1

    this._elements[index] = this._undefined
    return index
  }

  public indexOf(element: T) {
    return this._elements.indexOf(element)
  }

  public valueOf(index: number) {
    return this._elements[index] ?? this._undefined
  }

  public has(element: T) {
    if (element == this._undefined || !element) return false
    for (let i = 0; i < this._elements.length; i++)
      if (this._elements[i] == element) return true
    return false
  }

  public isUndefined(index: number) {
    if (this._elements[index] && this._elements[index] != this._undefined)
      return false
    return true
  }

  /**
   * @returns индекс свободной позиции внутри массива.
   */
  public get freeSpace(): number {
    var indexOfFreeSpace = this._hasFreeSpace

    if (!~indexOfFreeSpace) return this._elements.length
    return indexOfFreeSpace
  }

  /**
   * @returns true, если внутри {@link OneTypeArray._elements} есть хотя бы один элемент вида {@link OneTypeArray._undefined}
   */
  protected get _hasFreeSpace() {
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
