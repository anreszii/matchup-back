import { List } from "../../Classes";

describe('List class', () => {
  describe('unfixed size', () => {
    let list: List<number>
    const TEST_DATA: Array<number> = [
      1,
      51,
      3014,
      -1000,
      0,
      -1,
    ]

    beforeEach(() => {
      list = new List()
    })

    test('push solo value', () => {
      console.log(list)
      list.add(TEST_DATA[0])
      expect(list.values().next().value).toBe(TEST_DATA[0])
    })

    test('push array of value', () => {
      list.add(...TEST_DATA)
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
      }
    })

    test('delete value', () => {
      list.add(...TEST_DATA)
      let status = list.delete(TEST_DATA[3])
      expect(status).toBeTruthy()

      let copy = TEST_DATA.slice()
      copy.splice(3,1)

      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(copy[index])
        index++
      }

      status = list.delete(1000000)
      expect(status).toBeFalsy()
    })

    test('push after delete', () => {
      list.add(...TEST_DATA)
      list.delete(TEST_DATA[3])
      list.add(TEST_DATA[3])
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
    }
    })

    test('get index', () => {
      list.add(...TEST_DATA)
      let knownIndex = Math.floor(Math.random() * (TEST_DATA.length))

      expect(list.indexOf(TEST_DATA[knownIndex])).toBe(knownIndex)
      expect(list.indexOf(TEST_DATA[1000])).toBe(-1)
    })

    test('get value', () => {
      list.add(...TEST_DATA)
      let knownIndex = Math.floor(Math.random() * (TEST_DATA.length))

      expect(list.valueOf(knownIndex)).toBe(TEST_DATA[knownIndex])
      expect(list.valueOf(TEST_DATA.length + 1)).toBeUndefined()
    })
  })

  describe('fixed size', () => {
    let list: List<number>
    const TEST_DATA: Array<number> = [
      1,
      51,
      3014,
      -1000,
      0,
      -1,
    ]

    beforeEach(() => {
      list = new List(TEST_DATA.length-2)
    })

    test('push solo value', () => {
      list.add(TEST_DATA[0])
      expect(list.values().next().value).toBe(TEST_DATA[0])
    })

    test('push array of value', () => {
      list.add(...TEST_DATA)
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
      }
    })

    test('delete value', () => {
      list.add(...TEST_DATA)
      let status = list.delete(TEST_DATA[3])
      expect(status).toBeTruthy()

      let copy = TEST_DATA.slice()
      copy.splice(3,1)

      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(copy[index])
        index++
      }

      status = list.delete(1000000)
      expect(status).toBeFalsy()
    })

    test('push after delete', () => {
      list.add(...TEST_DATA)
      let status = list.delete(TEST_DATA[3])
      list.add(TEST_DATA[3])
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
    }
    })

    test('get index', () => {
      list.add(...TEST_DATA)
      let knownIndex = Math.floor(Math.random() * (TEST_DATA.length))

      expect(list.indexOf(TEST_DATA[knownIndex])).toBe(knownIndex)
      expect(list.indexOf(TEST_DATA[1000])).toBe(-1)
    })

    test('get value', () => {
      list.add(...TEST_DATA)
      let knownIndex = Math.floor(Math.random() * (TEST_DATA.length))

      expect(list.valueOf(knownIndex)).toBe(TEST_DATA[knownIndex])
      expect(list.valueOf(TEST_DATA.length + 1)).toBeUndefined()
    })
  })

  describe('custom undefined', () => {
    let list: List<string>
    const TEST_DATA: Array<string> = [
      'test1',
      'test2',
      'test3',
      'test4',
      'test5',
      'test6',
    ]

    beforeEach(() => {
      list = new List(TEST_DATA.length-2, 'undefined')
    })

    test('push solo value', () => {
      list.add(TEST_DATA[0])
      expect(list.values().next().value).toBe(TEST_DATA[0])
    })

    test('push array of value', () => {
      list.add(...TEST_DATA)
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
      }
    })

    test('push undefined', () => {
      let status = list.add('undefined', TEST_DATA[0], 'undefined', TEST_DATA[1], 'undefined')
      expect(status).toBeFalsy()
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
      }
      expect(index).toBe(2)
    })

    test('delete value', () => {
      list.add(...TEST_DATA)
      let status = list.delete(TEST_DATA[3])
      expect(status).toBeTruthy()

      status = list.delete('undefined', TEST_DATA[2], 'undefined')
      expect(status).toBeFalsy()

      let copy = TEST_DATA.slice()
      copy.splice(2,2)

      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(copy[index])
        index++
      }

      status = list.delete('unknown')
      expect(status).toBeFalsy()

      status = list.delete('undefined')
      expect(status).toBeFalsy()

    })

    test('push after delete', () => {
      list.add(...TEST_DATA)
      let status = list.delete(TEST_DATA[3])
      list.add(TEST_DATA[3])
      let index = 0
      for(let container of list.values()) {
        expect(container).toBe(TEST_DATA[index])
        index++
    }
    })

    test('get index', () => {
      list.add(...TEST_DATA)
      let knownIndex = Math.floor(Math.random() * (TEST_DATA.length))

      expect(list.indexOf(TEST_DATA[knownIndex])).toBe(knownIndex)
      expect(list.indexOf(TEST_DATA[1000])).toBe(-1)
    })

    test('get value', () => {
      list.add(...TEST_DATA)
      let knownIndex = Math.floor(Math.random() * (TEST_DATA.length))

      expect(list.valueOf(knownIndex)).toBe(TEST_DATA[knownIndex])
      expect(list.valueOf(TEST_DATA.length + 1)).toBe('undefined')
    }) 
  })
}) 