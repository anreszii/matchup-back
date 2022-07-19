let math = require('../utils').math

module.exports.adaptive = new Map()
  .set('killCount', new AdaptiveTask(10, 30, 10, { amount: 100, type: 'mp' }))
  .set('headshotCount', new AdaptiveTask(5, 20, 5, { amount: 100, type: 'mp' }))
  .set('assistsCount', new AdaptiveTask(10, 50, 10, { amount: 50, type: 'mp' }))
  .set('victoriesCount', new AdaptiveTask(5, 15, 5, { amount: 100, type: 'mp' }))

function AdaptiveTask(minCount, maxCount, step, reward) {
  this.minCount = minCount
  this.maxCount = maxCount
  this.step = step
  this.reward = reward
}

AdaptiveTask.prototype.getTask = function () {
  let count = math.getRounded(math.minMax(this.minCount, this.maxCount), this.step)
  return {
    finalPoint: count,
    reward: {
      amount: (count / this.step) * this.reward.amount,
      type: this.reward.type,
    },
  }
}

module.exports.static = new Map().set('completeDaily', {
  finalPoint: 3,
  reward: {
    amount: 200,
    type: 'mp',
  },
})
