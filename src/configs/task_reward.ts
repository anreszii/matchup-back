export type DYNAMIC_TASK = {
  minPoints: number
  maxPoints: number
  stepForPoints: number
  reward: {
    mp?: number
    exp?: number
  }
}

export type STATIC_TASK = {
  points: number
  reward: {
    mp?: number
    exp?: number
  }
}

export const DYNAMIC_DATA: Map<string, DYNAMIC_TASK> = new Map()
DYNAMIC_DATA.set('killCount', {
  minPoints: 10,
  maxPoints: 30,
  stepForPoints: 10,
  reward: {
    mp: 100,
  },
})

DYNAMIC_DATA.set('assists', {
  minPoints: 5,
  maxPoints: 20,
  stepForPoints: 2,
  reward: {
    mp: 50,
  },
})

DYNAMIC_DATA.set('victories', {
  minPoints: 5,
  maxPoints: 30,
  stepForPoints: 2,
  reward: {
    mp: 100,
  },
})

DYNAMIC_DATA.set('played', {
  minPoints: 5,
  maxPoints: 30,
  stepForPoints: 1,
  reward: {
    mp: 30,
  },
})

export const STATIC_DATA: Map<string, STATIC_TASK> = new Map()
STATIC_DATA.set('completedDaily', {
  points: 3,
  reward: {
    mp: 100,
  },
})
