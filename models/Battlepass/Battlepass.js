const { Schema, model } = require('mongoose')
const RewardSchema = require('./Reward')

const BattlepassLevelSchema = new Schema({
  requiredEXP: { type: Number, required: true },
  reward: {
    type: RewardSchema,
  },
})

model('BattlepassLevel', BattlepassLevelSchema)

module.exports = class Battlepass {
  static levels

  static init = async function () {
    this.levels = await model('BattlepassLevel').find({})

    this.levels.sort(function (a, b) {
      if (a.requiredEXP < b.requiredEXP) return -1
      if (a.requiredEXP > b.requiredEXP) return 1
      if (a.requiredEXP == b.requiredEXP) return 0
    })
  }

  static getCurrentLevel(exp) {
    for (let level of this.levels) {
      if (exp < level.requiredEXP) return level
    }
  }
}
