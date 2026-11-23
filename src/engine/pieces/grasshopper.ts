import { addHex, DIRECTIONS, type Hex } from "../grid/hex.js"
import { isHexOccupied, type GameState } from "../state.js"

// jumps in a straight line over at least one piece to the first empty hex; freedom to move doesn't apply
export function getGrasshopperMoves(state : GameState, from : Hex) : Hex[]{
    const result : Hex[] = []

    for (const direction of DIRECTIONS){
        let current = addHex(from, direction)
        if (!isHexOccupied(state, current)) continue

        while (isHexOccupied(state, current)){
            current = addHex(current, direction)
        }
        result.push(current)
    }

    return result
}
