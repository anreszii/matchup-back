export * from './Classes'
export * from './Utils'
export * from './validation'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string
    }
  }
}

export declare type SUPPORTED_GAMES = 'StandOff2'
