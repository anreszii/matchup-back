export * from './Classes'
export * from './Utils'
export * from './validation'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string
      SALT: string
    }
  }
}
