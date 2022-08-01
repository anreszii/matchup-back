export type command = 'spectator' | 'neutral' | 'command1' | 'command2'

export type Member = {
  name: string
  command: command
  readyFlag: boolean
}
