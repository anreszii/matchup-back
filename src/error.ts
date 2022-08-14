export const enum validationCause {
  INVALID_FORMAT = 'invalid format',
  REQUIRED = 'required',
  NOT_EXIST = `doesn't exist`,
  ALREADY_EXIST = 'already exist',
  INVALID = `invalid`,
}

export const enum matchCause {
  CREATE = 'create',
  ADD_MEMBER = 'add member',
  REMOVE_MEMBER = 'remove member',
  UPDATE_MEMBER = 'update member',
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
  constructor(private _key: string, public errorCause: validationCause) {
    super(`${_key} ${errorCause}`)
  }

  public get genericMessage(): string {
    switch (this.errorCause) {
      case validationCause.INVALID_FORMAT:
        return FormatError(this._key)
      case validationCause.REQUIRED:
        return RequiredError(this._key)
      case validationCause.NOT_EXIST:
        return NotExistError(this._key)
      case validationCause.INVALID:
        return InvalidError(this._key)
      case validationCause.ALREADY_EXIST:
        return ExistError(this._key)
    }
  }
}

export class MatchError extends MatchUpError {
  name: 'MatchControllError' = 'MatchControllError'
  constructor(private _lobbyID: string, public errorCause: matchCause) {
    super(`match ${_lobbyID} error: ${errorCause}`)
  }

  public get genericMessage(): string {
    switch (this.errorCause) {
      case matchCause.CREATE:
        return CreateMatchError(this._lobbyID)
      case matchCause.ADD_MEMBER:
        return AddMemberError(this._lobbyID)
      case matchCause.REMOVE_MEMBER:
        return RemoveMemberError(this._lobbyID)
      case matchCause.UPDATE_MEMBER:
        return UpdateMember(this._lobbyID)
    }
  }
}

export class WebSocketManageError extends MatchUpError {
  constructor(private _id: string, public errorCause: wsManageCause) {
    super(`socket#${_id}: ${errorCause}`)
  }

  public get genericMessage() {
    switch (this.errorCause) {
      case wsManageCause.NOT_FOUND:
        return FoundError(this._id)
    }
  }
}

function FormatError(name: string) {
  return `invalid ${name} format`
}

function NotExistError(name: string) {
  return `${name} doesn't exist`
}

function ExistError(name: string) {
  return `${name} already exist`
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

function UpdateMember(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to update member`
}

function FoundError(socketID: string) {
  return `socket#s${socketID}: doesn't exist`
}
