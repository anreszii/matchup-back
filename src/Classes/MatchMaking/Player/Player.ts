import { Match } from '../../../Interfaces'
import type { DocumentType } from '@typegoose/typegoose'
import { clientServer } from '../../../API/Sockets'
import {
  PlayerSignals,
  PlayerStates,
} from '../../../Interfaces/MatchMaking/Player'
import {
  NotificationModel,
  NotificationQueue,
  User,
  UserModel,
} from '../../../Models'
import { Logger } from '../../../Utils/Logger'
import { DTO } from '../../DTO/DTO'
import { TEAMS } from '../Team/Manager'
import { COMMANDS } from '../Command/Manager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { StandOff_Lobbies } from '../Lobby/Manager'
import { TechnicalCause, TechnicalError } from '../../../error'
import { sleep } from '../../../Utils/sleep'

//TODO добавить логику в transition
export class Player implements Match.Player.Instance {
  public id!: Match.Player.ID
  public data!: Match.Player.Data

  private _logger = new Logger('Player', 'Instance')
  private _state!: PlayerStates
  private _timers: Map<PlayerStates, Date> = new Map()
  private _notifications?: DocumentType<NotificationQueue>

  constructor(public name: string) {
    this.event(PlayerSignals.init)
    UserModel.findByName(name)
      .then((document) => {
        if (!document)
          throw new TechnicalError('user document', TechnicalCause.NOT_EXIST)

        NotificationModel.getForUser(document)
          .then((queue) => {
            if (!queue) return
            this._notifications = queue
          })
          .catch((e: Error) => {
            this._logger.warning(
              `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
            )
          })

        let discordNick = document.profile.discord_nickname
        if (!discordNick) discordNick = document.profile.username
        let nick = document.profile.nickname
        if (!nick) nick = 'undefined'

        this.id = String(document._id)
        this.data = {
          id: String(document._id),
          name: document.profile.username,
          nick,
          discordNick,
          GRI: document.GRI,
          prefix: document.prefix,
          guild: document.guild == undefined ? undefined : `${document.guild}`,
          flags: {
            ready: false,
            searching: false,
          },
        }

        this.event(PlayerSignals.be_online)
      })
      .catch((e: Error) => {
        this._logger.critical(
          `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
        )
        throw e
      })
  }

  event(signal: PlayerSignals, data?: { [key: string]: unknown }) {
    switch (signal) {
      case PlayerSignals.delete:
        this.delete()
        break
      case PlayerSignals.init:
        this._setState(PlayerStates.init)
        break
      case PlayerSignals.be_idle:
        this._setState(PlayerStates.idle)
        this._timers.set(PlayerStates.idle, new Date())
        setTimeout(() => {
          if (this.state == PlayerStates.idle) this.delete()
        }, MINUTE_IN_MS * 2)
        break
      case PlayerSignals.be_online:
        this._setState(PlayerStates.online)
        break
      case PlayerSignals.search:
        this._setState(PlayerStates.searching)
        break
      case PlayerSignals.join_lobby:
        if (
          !data ||
          typeof data.lobby != 'string' ||
          typeof data.chat != 'string'
        )
          return
        if (this.state >= PlayerStates.waiting) return
        this._setState(PlayerStates.waiting)
        this.data.lobbyID = data.lobby
        this.send(
          'lobby',
          new DTO({ label: 'join', id: data.lobby, chat: data.chat }),
        )
        break
      case PlayerSignals.leave_lobby:
        if (this.state <= PlayerStates.searching) return
        this.send('lobby', new DTO({ label: 'leave', id: this.data.lobbyID }))
        this.data.lobbyID = undefined
        this._setState(PlayerStates.online)
        break
      case PlayerSignals.be_ready:
        this._setState(PlayerStates.ready)
        this.data.flags.ready = true
        break
      case PlayerSignals.be_unready:
        this._setState(PlayerStates.searching)
        this.data.flags.ready = false
        break
      case PlayerSignals.vote:
        this._setState(PlayerStates.voting)
        break
      case PlayerSignals.prepare:
        this._setState(PlayerStates.preparing)
        break
      case PlayerSignals.play:
        this._setState(PlayerStates.playing)
        break
      case PlayerSignals.corrupt:
        const currentData = this.data
        if (currentData.lobbyID) {
          StandOff_Lobbies.get(currentData.lobbyID)?.delete()
          currentData.lobbyID = undefined
        }
        if (currentData.teamID) {
          TEAMS.get(currentData.teamID)?.leave(currentData.name)
          currentData.teamID = undefined
        }
        if (currentData.commandID) {
          COMMANDS.get(currentData.commandID)?.leave(currentData.name)
          currentData.commandID = undefined
        }
        currentData.flags = {
          ready: false,
          searching: false,
        }
        this.event(PlayerSignals.be_online)
    }
  }

  async waitForState(state: PlayerStates): Promise<void> {
    while (this.state != state) await sleep(5)
  }

  delete(): boolean {
    if (this.state > PlayerStates.searching)
      StandOff_Lobbies.get(this.data.lobbyID!)?.markToDelete()

    if (this.data.teamID) TEAMS.get(this.data.teamID)?.leave(this.data.name)
    this._setState(PlayerStates.deleted)
    return true
  }

  send(event: string, content: DTO): void {
    if (clientServer.Aliases.isSet(this.data.name))
      clientServer
        .control(clientServer.Aliases.get(this.data.name)!)
        .emit(event, content.to.JSON)
  }

  notify(content: string): void {
    this._logger.trace(`creating notify. content: ${content}`)
    if (!this._notifications) return
    this.send(
      'notify',
      new DTO({
        label: 'notify',
        content: content,
      }),
    )
    this._notifications.push(content).catch((e: Error) => {
      this._logger.warning(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
    })
  }

  update(): Promise<boolean> {
    this._logger.trace(`Updating data. OLD: ${JSON.stringify(this.data)}`)
    return UserModel.findById(this.id)
      .then((document) => {
        if (!document) {
          this.event(PlayerSignals.corrupt)
          return false
        }
        this._getDataFromDocument(document as unknown as DocumentType<User>)
        this._logger.trace(`Updating data. NEW: ${JSON.stringify(this.data)}`)
        return true
      })
      .catch((e: Error) => {
        this._logger.fatal(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
        this.event(PlayerSignals.delete)
        return false
      })
  }

  isPremium(): Promise<boolean> {
    return UserModel.findById(this.id)
      .then((user) => {
        if (!user) return false
        return user.isPremium()
      })
      .catch((e: Error) => {
        this._logger.fatal(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
        return false
      })
  }

  get state(): PlayerStates {
    return this._state
  }

  get readyToDrop(): boolean {
    if (this.state > PlayerStates.online) return false
    return true
  }

  private _getDataFromDocument(document: DocumentType<User>) {
    this.data.nick = document.profile.nickname
    this.data.GRI = document.GRI
    this.data.prefix = document.prefix
    this.data.discordNick = document.profile.discord_nickname
      ? document.profile.discord_nickname
      : document.profile.username
    this.data.guild =
      document.guild == undefined ? undefined : `${document.guild}`
  }

  private _setState(state: PlayerStates) {
    this._state = state
  }
}
