import type io from 'gamesocket.io'
import {
  ValidationError,
  validationCause,
  wsManageCause,
  WebSocketManageError,
} from '../error.js'

export class WebSocketValidatior {
  constructor(private _app: ReturnType<typeof io>) {}

  public validateSocket(socketID: string): void | never {
    let socket = this._getSocket(socketID)

    if (!socket.isAuth)
      throw new ValidationError('socket', validationCause.INVALID)
  }

  public authorizeSocket(socketID: string) {
    let socket = this._getSocket(socketID)
    socket.isAuth = true
  }

  private _getSocket(socketID: string) {
    let socket = this._app.sockets.get(socketID)
    if (!socket)
      throw new WebSocketManageError(socketID, wsManageCause.NOT_FOUND)

    return socket
  }
}
