import { expType } from '../Models/Task/ExpirationTime'

export type DYNAMIC_TASK = {
  minPoints: number
  maxPoints: number
  stepForPoints: number
  expirationType?: expType
  reward: {
    mp?: number
    exp?: number
  }
}

export type STATIC_TASK = {
  points: number
  expirationType?: expType
  reward: {
    mp?: number
    exp?: number
  }
}

export class MAP_FOR_DYNAMIC_TASKS extends Map<string, DYNAMIC_TASK> {
  public getRandomDaily(usedTasksNames?: Array<string>) {
    for (let [name, task] of this.entries()) {
      if (task.expirationType == 'day' && !usedTasksNames?.includes(name))
        return {
          name,
          data: task as DYNAMIC_TASK & { expirationType: 'day' },
        }
    }
  }
}

export const DYNAMIC_DATA = new MAP_FOR_DYNAMIC_TASKS()
DYNAMIC_DATA.set('killCount', {
  minPoints: 10,
  maxPoints: 30,
  stepForPoints: 10,
  expirationType: 'day',
  reward: {
    mp: 100,
  },
})

DYNAMIC_DATA.set('assists', {
  minPoints: 5,
  maxPoints: 20,
  stepForPoints: 2,
  expirationType: 'day',
  reward: {
    mp: 50,
  },
})

DYNAMIC_DATA.set('victories', {
  minPoints: 5,
  maxPoints: 30,
  stepForPoints: 2,
  expirationType: 'day',
  reward: {
    mp: 100,
  },
})

DYNAMIC_DATA.set('played', {
  minPoints: 5,
  maxPoints: 30,
  stepForPoints: 1,
  expirationType: 'day',
  reward: {
    mp: 30,
  },
})

export const STATIC_DATA: Map<string, STATIC_TASK> = new Map()
STATIC_DATA.set('completedDaily', {
  points: 3,
  expirationType: 'day',
  reward: {
    mp: 100,
  },
})
