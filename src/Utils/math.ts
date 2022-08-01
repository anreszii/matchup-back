export function minMax(min: number, max: number) {
  let rand = min + Math.random() * (max + 1 - min)
  return Math.floor(rand)
}

export function getRounded(num: number, round: number) {
  return Math.round(num / round) * round
}
