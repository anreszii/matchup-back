export * from './Manager'
export * from './MatchMaking'
export * from './Chat'
export * from './RoleManager'
export * from './DTO'

export declare type USER_ROLE = 'default' | 'admin'
export interface Loadable {
  load(): Promise<void>
}

export interface StateMachine<STATES> {
  transition(signal: string, ...data: unknown[])
}
