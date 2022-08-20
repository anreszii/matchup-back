import { ChatManager, Gamesocket } from "../../../Classes/index.js"
import type { Chat } from "../../../Interfaces/index.js"

describe('Chat manager', () => {
  let manager: Chat.Manager
  beforeEach(() => {
    manager = new ChatManager()
  })
  test('create chat', () => {
    let chat = manager.spawn('gamesocket.io', {namespace: 'test', room: 'test'})
    expect(chat).toEqual(manager.get(chat.id))
    expect(chat.id).toBe(0)
  })

  test('create/delete random chats count', () => {
    let randomCount = Math.floor(Math.random() * 100) 
    for(let i = 0; i < randomCount; i++) manager.spawn('gamesocket.io', {namespace: 'test', room: 'test'})
    
    for(let i = 0; i < randomCount; i++) {
      let randomID = Math.floor(Math.random() * randomCount)
      manager.drop(randomID)
      
      expect(manager.has(randomID)).toBeFalsy()
      
      let chat = manager.spawn('gamesocket.io', {namespace: 'test', room: 'test'})
      expect(chat.id).toBe(randomID)
    }
    
  })
})

describe('Chat', () => {
  
})