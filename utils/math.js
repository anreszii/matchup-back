module.exports.minMax = function (min, max) {
  let rand = min + Math.random() * (max + 1 - min)
  return Math.floor(rand)
}

module.exports.getRounded = function (num, round) {
  return Math.round(num / round) * round
}
