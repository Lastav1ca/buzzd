import { getNeighbors } from "./grid/hex.js"
import type { Color } from "./pieces/types.js"
import { findQueen, isHexOccupied, type GameState } from "./state.js"

export type GameStatus =
    | { kind : 'ongoing' }
    | { kind : 'win', winner : Color }
    | { kind : 'draw' }

export function isQueenSurrounded(state : GameState, color : Color) : boolean{
    const queen = findQueen(state, color)
    if (!queen) return false

    return getNeighbors(queen).every(n => isHexOccupied(state, n))
}

export function getStatus(state : GameState) : GameStatus{
    const whiteLost = isQueenSurrounded(state, 'white')
    const blackLost = isQueenSurrounded(state, 'black')

    if (whiteLost && blackLost) return { kind : 'draw' }
    if (whiteLost) return { kind : 'win', winner : 'black' }
    if (blackLost) return { kind : 'win', winner : 'white' }
    return { kind : 'ongoing' }
}
