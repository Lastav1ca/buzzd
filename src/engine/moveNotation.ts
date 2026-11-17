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

// notacija: https://entomology.gitlab.io/notation.html

const TYPE_LETTERS : Record<PieceType, string> = {
    queen : 'Q',
    ant : 'A',
    beetle : 'B',
    grasshopper : 'G',
    spider : 'S'
}

// gde je cilj u odnosu na referentnu figuru (dir = cilj - referenca)
// znak ispred reference = cilj je levo od nje, znak iza = desno
const POSITIONS : { dir : Hex, format : (ref : string) => string }[] = [
    { dir : { q : 1, r : 0 }, format : ref => `${ref}-` },     // desno
    { dir : { q : 1, r : -1 }, format : ref => `${ref}/` },    // gore desno
    { dir : { q : 0, r : -1 }, format : ref => `\\${ref}` },   // gore levo
    { dir : { q : -1, r : 0 }, format : ref => `-${ref}` },    // levo
    { dir : { q : -1, r : 1 }, format : ref => `/${ref}` },    // dole levo
    { dir : { q : 0, r : 1 }, format : ref => `${ref}\\` }     // dole desno
]

// wQ, wA1, bB2... broj samo za tipove kojih ima vise od jednog
export function formatPiece(piece : Piece) : string{
    const color = piece.color == 'white' ? 'w' : 'b'
    const number = PIECE_COUNTS[piece.type] > 1 ? piece.id : ''
    return `${color}${TYPE_LETTERS[piece.type]}${number}`
}

// state je stanje PRE poteza
export function formatMove(state : GameState, move : Move) : string{
    if (move.type == 'pass') return 'pass'

    let piece : Piece | undefined
    let board : GameState   // tabla bez figure koja se pomera, da ne bude sama sebi referenca

    if (move.type == 'place'){
        // postavlja se figura tog tipa sa najmanjim brojem
        piece = state.hands[getCurrentColor(state)].find(p => p.type == move.piece)
        board = state
    }else{
        piece = getTopPiece(state, move.from)
        board = removeTopPiece(state, move.from)
    }
    if (!piece) {throw new Error('No piece to move')}

    const name = formatPiece(piece)

    // prvi potez u igri nema referencu
    if (board.board.size == 0) return name

    // buba na vrhu druge figure: referenca je ta figura, bez znaka
    const below = getTopPiece(board, move.to)
    if (below) return `${name} ${formatPiece(below)}`

    for (const position of POSITIONS){
        const refHex = addHex(move.to, { q : -position.dir.q, r : -position.dir.r })
        const ref = getTopPiece(board, refHex)
        if (ref) return `${name} ${position.format(formatPiece(ref))}`
    }

    throw new Error('Destination has no neighbors')
}

// cela partija od pocetka: odigra poteze redom i vrati notaciju svakog
export function formatMoves(moves : Move[]) : string[]{
    let state = createInitialState()
    const result : string[] = []

    for (const move of moves){
        result.push(formatMove(state, move))
        state = applyMove(state, move)
    }

    return result
}
