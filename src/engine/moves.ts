import type { Hex } from "./grid/hex.js"
import type { Piece } from "./pieces/types.js"

type Move = {
    piece : Piece,
    from : Hex | undefined,
    to : Hex
}