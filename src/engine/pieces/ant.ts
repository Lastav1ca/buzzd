import { hexToKey, type Hex } from "../grid/hex.js"
import type { GameState } from "../state.js"
import { getSlides } from "./movement.js"

// bilo koliko koraka klizanjem oko kosnice (BFS)
export function getAntMoves(state : GameState, from : Hex) : Hex[]{
    const result : Hex[] = []
    const visited = new Set([hexToKey(from)])
    const queue : Hex[] = [from]

    while (queue.length > 0){
        const current = queue.shift()
        if (!current) break

        for (const next of getSlides(state, current)){
            const key = hexToKey(next)
            if (visited.has(key)) continue

            visited.add(key)
            result.push(next)
            queue.push(next)
        }
    }

    return result
}
