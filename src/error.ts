export const enum validationCause {
  INVALID_FORMAT = 'invalid format',
  REQUIRED = 'required',
  NOT_EXIST = `doesn't exist`,
  INVALID = `invalid`,
}

export const enum matchCause {
  CREATE = 'create',
  ADD_MEMBER = 'add member',
  REMOVE_MEMBER = 'remove member',
  CHANGE_COMMAND = 'change command',
}

export const enum wsManageCause {
  NOT_FOUND = 'not found',
}

interface genericMessage {
  get genericMessage(): string
}

export abstract class MatchUpError extends Error implements genericMessage {
  abstract get genericMessage(): string
}

export class ValidationError extends MatchUpError {
  name: 'ValidationError' = 'ValidationError'
  constructor(private _key: string, public cause: validationCause) {
    super(`${_key} ${cause}`)
  }

  public get genericMessage(): string {
    switch (this.cause) {
      case validationCause.INVALID_FORMAT:
        return FormatError(this._key)
      case validationCause.REQUIRED:
        return RequiredError(this._key)
      case validationCause.NOT_EXIST:
        return ExistError(this._key)
      case validationCause.INVALID:
        return InvalidError(this._key)
    }
  }
}

export class MatchError extends MatchUpError {
  name: 'MatchControllError' = 'MatchControllError'
  constructor(private _lobbyID: string, public cause: matchCause) {
    super(`match ${_lobbyID} error: ${cause}`)
  }

  public get genericMessage(): string {
    switch (this.cause) {
      case matchCause.CREATE:
        return CreateMatchError(this._lobbyID)
      case matchCause.ADD_MEMBER:
        return AddMemberError(this._lobbyID)
      case matchCause.REMOVE_MEMBER:
        return RemoveMemberError(this._lobbyID)
      case matchCause.CHANGE_COMMAND:
        return changeCommandError(this._lobbyID)
    }
  }
}

export class WebSocketManageError extends MatchUpError {
  constructor(private _id: string, public cause: wsManageCause) {
    super(`socket#${_id}: ${cause}`)
  }

  public get genericMessage() {
    switch (this.cause) {
      case wsManageCause.NOT_FOUND:
        return FoundError(this._id)
    }
  }
}

function FormatError(name: string) {
  return `invalid ${name} format`
}

function ExistError(name: string) {
  return `${name} doesn't exist`
}

function RequiredError(name: string) {
  return `${name} required`
}

function InvalidError(name: string) {
  return `invalid ${name}`
}

function CreateMatchError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to create match`
}

function AddMemberError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to add member`
}

function RemoveMemberError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to remove member`
}

function changeCommandError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to change member command`
}

function FoundError(socketID: string) {
  return `socket#s${socketID}: doesn't exist`
}
