import * as log4js from 'log4js'

const logConfig: log4js.Configuration = {
  appenders: {
    file: {
      type: 'file',
      filename: 'logs/main.log',
      layout: { type: 'pattern', pattern: '[%d] [%p] [%X{module}] %m%n' },
    },
  },
  categories: {
    default: { appenders: ['file'], level: 'trace' },
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
  constructor(private _module: string, private _element: string = '') {
    this._logger = log4js.getLogger()
    this._logger.addContext('module', _module)
  }

  trace(content: string): void {
    content = this._formatContent(content)
    this._logger.trace(content)
  }

  debug(content: string): void {
    content = this._formatContent(content)
    if (this._logger.isLevelEnabled('debug')) {
      const debugMessage =
        this._element != undefined
          ? `[${process.hrtime.bigint()}] [${this._module}::${
              this._element
            }::DEBUG]: `
          : `[${process.hrtime.bigint()}] [${this._module}::DEBUG]: `
      console.log(debugMessage)
    }

    this._logger.trace(content)
  }

  info(content: string): void {
    content = this._formatContent(content)
    this._logger.info(content)
  }

  warning(content: string): void {
    content = this._formatContent(content)
    this._logger.warn(content)
  }

  critical(content: string): void {
    content = this._formatContent(content)
    this._logger.error(content)
  }

  fatal(content: string): void {
    content = this._formatContent(content)
    this._logger.fatal(content)
  }

  private _formatContent(content: string) {
    if (!this._element) return content
    else return `<${this._element}>: ${content}`
  }
}
