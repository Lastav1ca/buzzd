import { getCommonNeighbors, getNeighbors, type Hex } from "../grid/hex.js"
import { getPiecesAt, type GameState } from "../state.js"
import { canSlide } from "./movement.js"

// one space, can also climb on top of other pieces
export function getBeetleMoves(state : GameState, from : Hex) : Hex[]{
    // the beetle is already removed from the board, so this is the height of the stack below it
    const fromHeight = getPiecesAt(state, from).length

    return getNeighbors(from).filter(to => {
        const toHeight = getPiecesAt(state, to).length

        // on the ground the same rules as sliding apply
        if (fromHeight == 0 && toHeight == 0){
            return canSlide(state, from, to)
        }

        // on top: blocked only if both common neighbors are higher than both the origin and the target
        const [a, b] = getCommonNeighbors(from, to)
        if (!a || !b) {throw new Error('Hexes are not neighbors')}
        const gateHeight = Math.min(getPiecesAt(state, a).length, getPiecesAt(state, b).length)

        return gateHeight <= Math.max(fromHeight, toHeight)
    })
}
