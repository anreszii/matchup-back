import { IChat } from '../../Interfaces/index'

export class Message implements IChat.Message {
  private _author: IChat.Author
  private _content: string
  constructor(author: string, content: string) {
    this._author = {
      name: author,
    }
    this._content = content
  }
  get author() {
    return this._author
  }

  get content() {
    return this._content
  }
}
