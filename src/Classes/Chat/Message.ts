import { IChat } from '../../Interfaces/index'

export class Message implements IChat.Message {
  constructor(private _author: string, private _content: string) {}
  get author(): string {
    return this._author
  }

  get content(): string {
    return this._content
  }
}
