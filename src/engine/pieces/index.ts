import type { Hex } from "../grid/hex.js"
import type { GameState } from "../state.js"
import type { PieceType } from "./types.js"
import { getAntMoves } from "./ant.js"
import { getBeetleMoves } from "./beetle.js"
import { getGrasshopperMoves } from "./grasshopper.js"
import { getQueenMoves } from "./queen.js"
import { getSpiderMoves } from "./spider.js"

// state is the board WITHOUT the moving piece, from is the hex it starts from
export type MoveFn = (state : GameState, from : Hex) => Hex[]

export const PIECE_MOVES : Record<PieceType, MoveFn> = {
    queen : getQueenMoves,
    ant : getAntMoves,
    spider : getSpiderMoves,
    grasshopper : getGrasshopperMoves,
    beetle : getBeetleMoves
}
