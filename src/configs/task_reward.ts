import { expType } from '../Models/Task/ExpirationTime'

export type DYNAMIC_TASK = {
  minPoints: number
  maxPoints: number
  stepForPoints: number
  expirationType?: expType
  customCoefficient?: number
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

  public getRandomWeekly(usedTasksNames?: Array<string>) {
    for (let [name, task] of this.entries()) {
      if (task.expirationType == 'week' && !usedTasksNames?.includes(name))
        return {
          name,
          data: task as DYNAMIC_TASK & { expirationType: 'week' },
        }
    }
  }
}

export const DYNAMIC_DATA = new MAP_FOR_DYNAMIC_TASKS()
DYNAMIC_DATA.set('kills', {
  minPoints: 10,
  maxPoints: 30,
  stepForPoints: 10,
  expirationType: 'day',
  reward: {
    mp: 50,
    exp: 300,
  },
})

DYNAMIC_DATA.set('kills', {
  minPoints: 100,
  maxPoints: 150,
  stepForPoints: 50,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

DYNAMIC_DATA.set('assists', {
  minPoints: 10,
  maxPoints: 20,
  stepForPoints: 5,
  expirationType: 'day',
  reward: {
    mp: 50,
  },
})

DYNAMIC_DATA.set('assists', {
  minPoints: 30,
  maxPoints: 40,
  stepForPoints: 10,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

DYNAMIC_DATA.set('victories', {
  minPoints: 1,
  maxPoints: 3,
  stepForPoints: 1,
  expirationType: 'day',
  reward: {
    mp: 100,
    exp: 300,
  },
})

DYNAMIC_DATA.set('victories', {
  minPoints: 10,
  maxPoints: 15,
  stepForPoints: 5,
  expirationType: 'day',
  reward: {
    exp: 1000,
  },
})

DYNAMIC_DATA.set('points', {
  minPoints: 50,
  maxPoints: 150,
  stepForPoints: 50,
  expirationType: 'day',
  reward: {
    mp: 100,
    exp: 300,
  },
})

DYNAMIC_DATA.set('ponts', {
  minPoints: 500,
  maxPoints: 800,
  stepForPoints: 150,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

export const STATIC_DATA: Map<string, STATIC_TASK> = new Map()
STATIC_DATA.set('completedDaily', {
  points: 3,
  expirationType: 'day',
  reward: {
    exp: 300,
  },
})

STATIC_DATA.set('completedWeekly', {
  points: 2,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

STATIC_DATA.set('win_Sandstone', {
  points: 1,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

STATIC_DATA.set('win_Rust', {
  points: 1,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

STATIC_DATA.set('win_Sakura', {
  points: 1,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

STATIC_DATA.set('win_Zone9', {
  points: 1,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})

STATIC_DATA.set('win_Province', {
  points: 1,
  expirationType: 'week',
  reward: {
    exp: 1000,
  },
})
