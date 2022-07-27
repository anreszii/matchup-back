export const enum validationCause {
  INVALID_FORMAT = 'invalid format',
  REQUIRED = 'required',
  NOT_EXIST = `doesn't exist`,
  INVALID = `invalid`,
}

export class ValidationError extends Error {
  constructor(public name: string, public cause: validationCause) {
    super(`${name} ${cause}`)
  }
}

export function CreateValidationMessage(name: string, cause: validationCause) {
  switch (cause) {
    case 'invalid format':
      return FormatError(name)
    case `doesn't exist`:
      return ExistError(name)
    case 'required':
      return RequiredError(name)
    case 'invalid':
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
