export function minMax(min: number, max: number) {
  let rand = min + Math.random() * (max + 1 - min)
  return Math.floor(rand)
}

export function getRounded(num: number, round: number) {
  return Math.round(num / round) * round
}

export function getMedian(...numbers: Array<number>): number {
  let tmp = new Array(numbers.length)
  for (let index = 0; index < numbers.length; index++)
    tmp[index] = numbers[index]

  tmp.sort((a, b) => a - b)
  const mid = Math.floor(tmp.length / 2)
  return tmp.length % 2 === 0 ? (tmp[mid - 1] + tmp[mid]) / 2 : tmp[mid]
}

/**
 *
 * @param toCheck число, которое должно находиться в диапазоне
 * @param standart число, от которого диапазон будет рассчитан
 * @param range диапазон
 * @returns находится ли {@link toCheck} в диапазоне.
 *
 * @example
 * ```ts
 *  inRange(5, 10, 6) //true, т.к. 5 находиться в промежутке [4; 16]
 *  inRange(18, 20, 1) //false, т.к. 18 не попадает в промежуток [19; 21]
 *
 * ```
 */
export function inRange(
  toCheck: number,
  standart: number,
  range: number,
): boolean {
  return standart - range <= toCheck && toCheck <= standart + range
}
