const { Schema, model } = require('mongoose')
const { Buffer } = require('node:buffer')

const RewardSchema = require('./Reward')

const rewards = require('../../configs/task_rewards')
const time = require('../../configs/time_constants')

const TaskSchema = new Schema({
  owner: { type: String, required: true, index: true },
  completeFlag: { type: Boolean, required: true, default: false },
  name: { type: String, required: true },
  reward: RewardSchema,
  progress: Buffer,
  optional: {
    expirationTime: Date,
  },
})

TaskSchema.methods.createAdaptive = function (owner, taskName) {
  if (!rewards.adaptive.has(taskName)) throw Error(`Task with name ${taskName} doesn't exist`)
  this.owner = owner
  this.name = taskName

  let result = rewards.adaptive.get(taskName).getTask()
  if (!result) throw Error(`Task with name ${taskName} doesn't exist`)

  this.reward = {
    amount: result.reward.amount,
    type: result.reward.type,
  }

  if (result.finalPoint) this.setProgressFinalPoint(result.finalPoint)
}

TaskSchema.methods.createStatic = function (owner, taskName) {
  if (!rewards.static.has(taskName)) throw Error(`Task with name ${taskName} doesn't exist`)
  this.owner = owner
  this.name = taskName

  let result = rewards.static.get(taskName)
  if (!result) throw Error(`Task with name ${taskName} doesn't exist`)

  this.reward = {
    amount: result.reward.amount,
    type: result.reward.type,
  }

  if (result.finalPoint) this.setProgressFinalPoint(result.finalPoint)
}

TaskSchema.methods.complete = async function (owner, taskName) {
  let Task = new model('Task')
  let reward = this.reward
  this.completeFlag = true

  if (rewards.adaptive.has(this.name)) {
    let task = await Task.findOne({ owner: this.owner, name: 'completeDaily' })
    await this.save()
    return {
      static: await task.addProgress(1),
      adaptive: {
        amount: reward.amount,
        type: reward.type,
      },
    }
  }

  await this.save()
  return {
    amount: reward.amount,
    type: reward.type,
  }
}

TaskSchema.methods.setProgressFinalPoint = function (finalPoint) {
  if (this.progress) throw Error('Progress final point is setted.')

  this.progress = Buffer.from(`0:${finalPoint}`)
}

TaskSchema.methods.getProgress = function () {
  if (!this.progress) throw Error('Progress unsetted.')

  let result = this.progress.toString().split(':')
  return {
    currentPoint: Number(result[0]),
    finalPoint: Number(result[1]),
  }
}

TaskSchema.methods.addProgress = async function (amount) {
  if (this.completeFlag) return
  if (!this.progress) throw Error('Progress unsetted. Use setProgress instead')

  let progress = this.getProgress()
  if (progress.currentPoint + amount >= progress.finalPoint) return this.complete()

  this.progress = Buffer.from(`${progress.currentPoint + amount}:${progress.finalPoint}`)

  await this.save()
  return
}

TaskSchema.methods.setExpirationTime = function (amount, format) {
  if (this.optional.expirationTime) throw Error('Expiration time has already set')

  let date = new Date().getTime()
  let resultInMs = undefined

  switch (format) {
    case 'minutes': {
      resultInMs = date + amount * time.MINUTE_IN_MS
      break
    }

    case 'hours': {
      resultInMs = date + amount * time.HOUR_IN_MS
      break
    }

    case 'days': {
      resultInMs = date + amount * time.DAY_IN_MS
      break
    }

    default: {
      resultInMs = date + amount
      break
    }
  }

  this.optional.expirationTime = new Date(resultInMs)
}

TaskSchema.methods.getExpirationTime = function () {
  if (!this.optional.expirationTime) throw Error(`Expiration time isn't setted`)

  return this.optional.expirationTime
}

TaskSchema.methods.expiresIn = function () {
  if (!this.optional.expirationTime) throw Error(`Expiration time isn't setted`)

  let timePassed = this.optional.expirationTime.getTime() - new Date().getTime()

  return parseInt(timePassed / time.MINUTE_IN_MS)
}

model('Task', TaskSchema)
