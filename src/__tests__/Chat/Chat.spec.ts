import { ChatManager } from "../../Classes"
import type { IManager, IChat } from "../../Interfaces"

describe('Chat', () => {
  let manager: IManager<IChat, number>
  beforeEach(() => {
    manager = new ChatManager()
  })
  test('create chat', () => {
    let chat = manager.spawn()
    expect(chat).toEqual(manager.get(chat.id))
    expect(chat.id).toBe(0)
  })

  test('create/delete radnom chats count', () => {
    let randomCount = Math.floor(Math.random() * 100) 
    for(let i = 0; i < randomCount; i++) manager.spawn()
    
    for(let i = 0; i < randomCount; i++) {
      let randomID = Math.floor(Math.random() * randomCount)
      manager.drop(randomID)
      
      expect(manager.has(randomID)).toBeFalsy()
      
      let chat = manager.spawn()
      expect(chat.id).toBe(randomID)
    }
    
  })
})