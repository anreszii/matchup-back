export * from './Manager'
export * from './MatchMaking'
export * from './Chat'
export * from './RoleManager'
export * from './DTO'

export declare type USER_ROLE = 'default' | 'admin'
export interface Loadable {
  load(): Promise<void>
}

export interface StateMachine<SIGNALS, STATES> {
  event(signal: SIGNALS, data?: { [key: string]: unknown })
  waitForState(state: STATES): Promise<void>
}
