export * from './Classes/index.js'
export * from './Utils/index.js'
export * from './validation/index.js'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string
      SALT: string
    }
  }
}
