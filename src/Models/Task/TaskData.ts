import type { DYNAMIC_TASK } from '../../configs/task_reward'
import type { DocumentType } from '@typegoose/typegoose'
import { getRounded, minMax } from '../../Utils/math'

export class TaskData {
  public static getDataFrom(
    taskData: DocumentType<DYNAMIC_TASK> | DYNAMIC_TASK,
  ) {
    let reward = { mp: 0, exp: 0 }

    let pointsCount = getRounded(
      minMax(taskData.minPoints, taskData.maxPoints),
      taskData.stepForPoints,
    )

    if (taskData.reward.mp && taskData.reward.mp > 0) {
      reward.mp = (pointsCount / taskData.stepForPoints) * taskData.reward.mp
    }
    if (taskData.reward.exp && taskData.reward.exp > 0) {
      reward.exp = taskData.reward.exp
    }

    return {
      points: pointsCount,
      reward: reward,
    }
  }
}
