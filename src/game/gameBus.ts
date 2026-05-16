import type { AreaId, PlayerAction } from '../types/game'

type GameCommandMap = {
  'slackfish:start': undefined
  'slackfish:restart': undefined
  'slackfish:move-area': { area: AreaId }
  'slackfish:set-action': { action: PlayerAction }
}

const dispatch = <TName extends keyof GameCommandMap>(
  name: TName,
  detail: GameCommandMap[TName],
) => {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export const gameBus = {
  start: () => dispatch('slackfish:start', undefined),
  restart: () => dispatch('slackfish:restart', undefined),
  moveToArea: (area: AreaId) => dispatch('slackfish:move-area', { area }),
  setAction: (action: PlayerAction) => dispatch('slackfish:set-action', { action }),
}

export type GameCommandName = keyof GameCommandMap
