import { getOpponent, type Color } from "../engine/pieces/types.js"
import type { ColorChoice } from "./protocol.js"

type Choice = { playerId : string, choice : ColorChoice }

// same color or both random → random; color + random → whoever chose the color gets it
export function assignColors(a : Choice, b : Choice, random = Math.random) : Record<Color, string>{
    let aColor : Color

    if (a.choice != 'random' && a.choice != b.choice){
        aColor = a.choice
    }else if (b.choice != 'random' && a.choice != b.choice){
        aColor = getOpponent(b.choice)
    }else{
        aColor = random() < 0.5 ? 'white' : 'black'
    }

    return aColor == 'white'
        ? { white : a.playerId, black : b.playerId }
        : { white : b.playerId, black : a.playerId }
}
