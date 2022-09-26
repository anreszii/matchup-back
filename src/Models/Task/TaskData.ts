import type { DYNAMIC_TASK } from '../../configs/task_reward'
import { Reward } from './Reward'
import { getRounded, minMax } from '../../Utils'

export class TaskData {
  constructor(private _TASK_DATA: DYNAMIC_TASK) {}
  public get data() {
    let taskData = this._TASK_DATA
    let reward = { mp: 0, exp: 0 }

    let pointsCount = getRounded(
      minMax(taskData.minPoints, taskData.maxPoints),
      taskData.stepForPoints,
    )

    if (taskData.reward.mp && taskData.reward.mp > 0) {
      reward.mp = (pointsCount / taskData.stepForPoints) * taskData.reward.mp
    }
    if (taskData.reward.exp && taskData.reward.exp > 0) {
      reward.exp = (pointsCount / taskData.stepForPoints) * taskData.reward.exp
    }

    return {
      points: pointsCount,
      reward: reward,
    }
  }
}
