export const enum validationCause {
  INVALID_FORMAT = 'invalid format',
  REQUIRED = 'required',
  NOT_EXIST = `doesn't exist`,
  INVALID = `invalid`,
}

export class ValidationError extends Error {
  constructor(public id: string, public cause: validationCause) {
    super(`${id} ${cause}`)
  }
}

export function CreateValidationMessage(
  name: string,
  cause: validationCause,
): string {
  switch (cause) {
    case validationCause.INVALID_FORMAT:
      return FormatError(name)
    case validationCause.NOT_EXIST:
      return ExistError(name)
    case validationCause.REQUIRED:
      return RequiredError(name)
    case validationCause.INVALID:
      return InvalidError(name)
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

export const enum matchCause {
  CREATE = 'creating',
  ADD_MEMBERS = 'member join',
}

export class MatchError extends Error {
  constructor(public id: string, public cause: matchCause) {
    super(`match ${id} error: ${cause}`)
  }
}
