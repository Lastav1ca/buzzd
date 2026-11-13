import type { Hex } from "../grid/hex.js"
import type { GameState } from "../state.js"
import { getSlides } from "./movement.js"

// jedno polje klizanjem
export function getQueenMoves(state : GameState, from : Hex) : Hex[]{
    return getSlides(state, from)
}
