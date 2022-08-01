import io from 'gamesocket.io'
import { StandOffController } from '../../MatchMaking/Controllers/StandOff'
import { LobbyManager } from '../../MatchMaking/Lobby'

let Server = io()

let clientServer = Server.of('client')

Server.aliases.set('stin', 'asd')

clientServer.on('createMatch', async (escort) => {
  let lobby = LobbyManager.spawn(new StandOffController())
})

clientServer.on('add member', async (escort) => {
  let lobbyID = escort.get('lobby_id')
  if (typeof lobbyID != 'string') return

  let lobby = LobbyManager.get(lobbyID)
  if (!lobby) return

  let username = escort.get('username')
  if (!username) return

  let status = await lobby.addMember({
    name: 'username',
    command: 'neutral',
    readyFlag: false,
  })

  if (!status) return

  clientServer.control(escort.get('id') as string).emit('add member', {
    error: 'none',
    lobbyID: lobby.id,
    command: 'neutral',
    readyFlag: false,
  })
})
