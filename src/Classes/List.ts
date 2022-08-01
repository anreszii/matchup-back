export class List<T extends Object> {
  protected _elements: Array<T | undefined> = new Array()
  protected _undefined: undefined | T

  constructor(arraySize?: number, undefinedValue?: T) {
    if (undefinedValue) this._undefined = undefinedValue
    if (arraySize) this._elements = new Array(arraySize).fill(this._undefined)
  }

  public *values() {
    let index = 0
    while (index < this._elements.length) {
      if (this._elements[index] != this._undefined)
        yield this._elements[index++]
      else index++
    }
  }

  public add(...elements: Array<T>) {
    for (let element of elements.values())
      this._elements[this._freeSpace] = element
    return true
  }

  public delete(...elements: Array<T>) {
    for (let element of elements.values()) {
      if (element == this._undefined) return false

      let index = this._getElement(element)
      if (!~index) return false

      this._elements[index] = this._undefined
    }
    return true
  }

  protected get _hasFreeSpace() {
    return this._elements.includes(this._undefined)
  }

  protected get _freeSpace(): number {
    if (!this._hasFreeSpace) return this._elements.length
    return this._elements.indexOf(this._undefined)
  }

  protected _getElement(element: T) {
    return this._elements.indexOf(element)
  }
}
