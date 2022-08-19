import { IEntity } from '../Manager'

export interface IChatController extends IEntity<number> {
  delete(): Promise<boolean>
}
