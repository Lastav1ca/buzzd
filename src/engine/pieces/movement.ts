import { getCommonNeighbors, getNeighbors, type Hex } from "../grid/hex.js"
import { isHexOccupied, type GameState } from "../state.js"

// Slide from `from` to the adjacent `to`. Exactly one of the two common neighbors must be occupied:
// both occupied = the piece can't squeeze through (freedom to move),
// neither occupied = the piece would lose contact with the hive.
export function canSlide(state : GameState, from : Hex, to : Hex) : boolean{
    const [a, b] = getCommonNeighbors(from, to)
    if (!a || !b) {throw new Error('Hexes are not neighbors')}

    return isHexOccupied(state, a) != isHexOccupied(state, b)
}

// all empty adjacent hexes the piece can slide to in one step
export function getSlides(state : GameState, from : Hex) : Hex[]{
    return getNeighbors(from).filter(to => !isHexOccupied(state, to) && canSlide(state, from, to))
}
