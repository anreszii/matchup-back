const { describe, default: test, it } = require('node:test')
const { Logger } = require('../lib/Utils/Logger')

describe('Testing logger', {}, () => {
  let logger, logger2, logger3
  it('Log module', () => {
    logger = new Logger('testModule1')
    logger2 = new Logger('testModule2')
    logger3 = new Logger('testModule3')
    for (let i = 0; i < 64; i++) {
      logger.trace(`content-${i}`)
      logger.debug(`content-${i}`)
      logger.info(`content-${i}`)
      logger.warning(`content-${i}`)
      logger.critical(`content-${i}`)
      logger.fatal(`content-${i}`)

      logger2.trace(`content-${i}`)
      logger2.debug(`content-${i}`)
      logger2.info(`content-${i}`)
      logger2.warning(`content-${i}`)
      logger2.critical(`content-${i}`)
      logger2.fatal(`content-${i}`)

      logger3.trace(`content-${i}`)
      logger3.debug(`content-${i}`)
      logger3.info(`content-${i}`)
      logger3.warning(`content-${i}`)
      logger3.critical(`content-${i}`)
      logger3.fatal(`content-${i}`)
    }
  })

  it('Log module element', () => {
    logger = new Logger('testModule', 'element1')
    logger2 = new Logger('testModule', 'element2')
    logger3 = new Logger('testModule', 'element3')

    for (let i = 0; i < 64; i++) {
      logger.trace(`content-${i}`)
      logger.debug(`content-${i}`)
      logger.info(`content-${i}`)
      logger.warning(`content-${i}`)
      logger.critical(`content-${i}`)
      logger.fatal(`content-${i}`)

      logger2.trace(`content-${i}`)
      logger2.debug(`content-${i}`)
      logger2.info(`content-${i}`)
      logger2.warning(`content-${i}`)
      logger2.critical(`content-${i}`)
      logger2.fatal(`content-${i}`)

      logger3.trace(`content-${i}`)
      logger3.debug(`content-${i}`)
      logger3.info(`content-${i}`)
      logger3.warning(`content-${i}`)
      logger3.critical(`content-${i}`)
      logger3.fatal(`content-${i}`)
    }
  })
})
