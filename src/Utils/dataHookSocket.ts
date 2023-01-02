import WebSocket = require('ws')
import { SECOND_IN_MS } from '../configs/time_constants'
import { sleep } from './sleep'
import { v4 as uuid } from 'uuid'

export class fetchWebSocket {
  private _parsedData: Map<string, unknown | null> = new Map()
  private _socket
  private _maxWaitingTime = SECOND_IN_MS * 5
  private _processDowntimeInMs = 50
  constructor(url: string) {
    this._socket = new WebSocket(url)
    this._socket.on('message', (data) => {
      let parsed = JSON.parse(Buffer.from(data as Buffer).toString())
      if (typeof parsed.id == 'string') this._parsedData.set(parsed.id, parsed)
    })
  }

  async fetch(data: { [key: string]: unknown }, id: string = uuid()) {
    data.id = id
    this._parsedData.set(id, null)

    this._socket.send(JSON.stringify(data), function (err) {
      if (err) console.error(err)
    })
    const startTimer = new Date()
    while (Date.now() - startTimer.getMilliseconds() > this._maxWaitingTime) {
      let data = this._parsedData.get(id)
      if (data) {
        this._parsedData.delete(id)
        return data
      }
      await sleep(this._processDowntimeInMs)
    }

    return null
  }
}
