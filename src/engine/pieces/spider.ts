import { hexToKey, keyToHex, type Hex } from "../grid/hex.js"
import type { GameState } from "../state.js"
import { getSlides } from "./movement.js"

const SPIDER_STEPS = 3

// tacno 3 koraka klizanjem, bez vracanja na polje kojim je vec prosao
export function getSpiderMoves(state : GameState, from : Hex) : Hex[]{
    const result : Set<string> = new Set()

    function walk(current : Hex, path : Set<string>){
        if (path.size == SPIDER_STEPS + 1){
            result.add(hexToKey(current))
            return
        }

        for (const next of getSlides(state, current)){
            const key = hexToKey(next)
            if (path.has(key)) continue
            walk(next, new Set([...path, key]))
        }
    }

    walk(from, new Set([hexToKey(from)]))
    return Array.from(result, keyToHex)
}
