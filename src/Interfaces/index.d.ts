export * from './Manager'
export * from './MatchMaking'
export * from './Chat'
export * from './RoleManager'
export * from './DTO'

export declare type USER_ROLE = 'default' | 'privileged' | 'admin'
export interface Loadable {
  load(): Promise<void>
}
