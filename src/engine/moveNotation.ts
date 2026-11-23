import { addHex, type Hex } from "./grid/hex.js"
import { applyMove, type Move } from "./moves.js"
import { PIECE_COUNTS, type Piece, type PieceType } from "./pieces/types.js"
import {
    createInitialState,
    getCurrentColor,
    getTopPiece,
    isHexOccupied,
    removeTopPiece,
    type GameState
} from "./state.js"

// notation: https://entomology.gitlab.io/notation.html

const TYPE_LETTERS : Record<PieceType, string> = {
    queen : 'Q',
    ant : 'A',
    beetle : 'B',
    grasshopper : 'G',
    spider : 'S'
}

// where the target is relative to the reference piece (dir = target - reference)
// sign before the reference = target is to its left, sign after = to its right
const POSITIONS : { dir : Hex, format : (ref : string) => string }[] = [
    { dir : { q : 1, r : 0 }, format : ref => `${ref}-` },     // right
    { dir : { q : 1, r : -1 }, format : ref => `${ref}/` },    // upper right
    { dir : { q : 0, r : -1 }, format : ref => `\\${ref}` },   // upper left
    { dir : { q : -1, r : 0 }, format : ref => `-${ref}` },    // left
    { dir : { q : -1, r : 1 }, format : ref => `/${ref}` },    // lower left
    { dir : { q : 0, r : 1 }, format : ref => `${ref}\\` }     // lower right
]

// wQ, wA1, bB2... number only for types with more than one piece
export function formatPiece(piece : Piece) : string{
    const color = piece.color == 'white' ? 'w' : 'b'
    const number = PIECE_COUNTS[piece.type] > 1 ? piece.id : ''
    return `${color}${TYPE_LETTERS[piece.type]}${number}`
}

// state is the state BEFORE the move
export function formatMove(state : GameState, move : Move) : string{
    if (move.type == 'pass') return 'pass'

    let piece : Piece | undefined
    let board : GameState   // board without the moving piece, so it can't be its own reference

    if (move.type == 'place'){
        // the piece of that type with the lowest number is placed
        piece = state.hands[getCurrentColor(state)].find(p => p.type == move.piece)
        board = state
    }else{
        piece = getTopPiece(state, move.from)
        board = removeTopPiece(state, move.from)
    }
    if (!piece) {throw new Error('No piece to move')}

    const name = formatPiece(piece)

    // the first move of the game has no reference
    if (board.board.size == 0) return name

    // beetle on top of another piece: the reference is that piece, without a sign
    const below = getTopPiece(board, move.to)
    if (below) return `${name} ${formatPiece(below)}`

    for (const position of POSITIONS){
        const refHex = addHex(move.to, { q : -position.dir.q, r : -position.dir.r })
        const ref = getTopPiece(board, refHex)
        if (ref) return `${name} ${position.format(formatPiece(ref))}`
    }

    throw new Error('Destination has no neighbors')
}

// whole game from the start: plays the moves in order and returns each one's notation
export function formatMoves(moves : Move[]) : string[]{
    let state = createInitialState()
    const result : string[] = []

    for (const move of moves){
        result.push(formatMove(state, move))
        state = applyMove(state, move)
    }

    return result
}
