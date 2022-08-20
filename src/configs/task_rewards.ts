import type { Reward } from '../Models/index.js'
import { getRounded, minMax } from '../Utils/index.js'

class Task {
  constructor(
    private step: number,
    private maxProgress: number,
    private reward: Reward,
    private staticFlag: boolean,
  ) {}
  get data() {
    switch (this.staticFlag) {
      case true: {
        let count = getRounded(minMax(this.step, this.maxProgress), this.step)

        return {
          isStatic: false,
          finalPoint: count,
          reward: {
            amount: (count / this.step) * this.reward.amount,
            type: this.reward.type,
          },
        }
      }
      case false: {
        return {
          isStatic: true,
          finalPoint: this.maxProgress,
          reward: this.reward,
        }
      }
    }
  }
}

export const TaksList = new Map<string, Task>()
  .set('killCount', new Task(10, 30, { amount: 100, type: 'mp' }, false))
  .set('headshotCount', new Task(5, 20, { amount: 100, type: 'mp' }, false))
  .set('assistsCount', new Task(10, 50, { amount: 50, type: 'mp' }, false))
  .set('victoriesCount', new Task(5, 15, { amount: 100, type: 'mp' }, false))
  .set('completeDaily', new Task(3, 3, { amount: 200, type: 'mp' }, true))
