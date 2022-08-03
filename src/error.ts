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
}

export class ValidationError extends Error {
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

export class MatchError extends Error {
  name: 'MatchControllError' = 'MatchControllError'
  constructor(private _lobbyID: string, public cause: matchCause) {
    super(`match ${_lobbyID} error: ${cause}`)
  }

  public get genericMessage(): string {
    switch (this.cause) {
      case matchCause.CREATE:
        return createMatchError(this._lobbyID)
      case matchCause.ADD_MEMBER:
        return addMemberError(this._lobbyID)
      case matchCause.REMOVE_MEMBER:
        return removeMemberError(this._lobbyID)
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

function createMatchError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to create match`
}

function addMemberError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to add member`
}

function removeMemberError(lobbyID: string) {
  return `Lobby#${lobbyID}: failed to remove member`
}
