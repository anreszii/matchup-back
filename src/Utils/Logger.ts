import * as log4js from 'log4js'

const logConfig: log4js.Configuration = {
  appenders: {
    file: {
      type: 'file',
      filename: 'logs/main.log',
      layout: { type: 'pattern', pattern: '[%d] [%p] [%c::%X{module}] %m%n' },
    },
    multiFile: {
      type: 'multiFile',
      base: 'logs/',
      property: 'module',
      extension: '.log',
      layout: {
        type: 'pattern',
        pattern: '[%d] [%p] [%X{element}] %m%n',
      },
    },
  },
  categories: {
    default: { appenders: ['file'], level: 'trace' },
    module: { appenders: ['file'], level: 'info' },
    element: { appenders: ['multiFile', 'file'], level: 'trace' },
  },
}
log4js.configure(logConfig)

interface ILogger {
  trace(content: string): void
  debug(content: string): void
  info(content: string): void
  warning(content: string): void
  critical(content: string): void
  fatal(content: string): void
}

export class Logger implements ILogger {
  private _logger!: log4js.Logger
  constructor(private _module: string, private _element?: string) {
    if (_element != undefined) {
      this._logger = log4js.getLogger('element')
      this._logger.addContext('element', _element)
    } else this._logger = log4js.getLogger('module')
    this._logger.addContext('module', _module)
  }

  trace(content: string): void {
    this._logger.trace(content)
  }

  debug(content: string): void {
    if (this._logger.isLevelEnabled('debug')) {
      const debugMessage =
        this._element != undefined
          ? `[${process.hrtime.bigint()}] [${this._module}::${
              this._element
            }::DEBUG]: ${content}`
          : `[${process.hrtime.bigint()}] [${this._module}::DEBUG]: ${content}`
      console.log(debugMessage)
    }

    this._logger.debug(content)
  }

  info(content: string): void {
    this._logger.info(content)
  }

  warning(content: string): void {
    this._logger.warn(content)
  }

  critical(content: string): void {
    this._logger.error(content)
  }

  fatal(content: string): void {
    this._logger.fatal(content)
  }
}
