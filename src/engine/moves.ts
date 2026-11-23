import type { Hex } from "./grid/hex.js"
import { getOpponent, type Color, type PieceType } from "./pieces/types.js"
import { PIECE_MOVES } from "./pieces/index.js"
import { getStatus } from "./status.js"
import {
    cloneState,
    getCurrentColor,
    getPlayerTurn,
    getTopPiece,
    isHexOccupied,
    isHiveConnected,
    isQueenPlaced,
    isTouchingColor,
    removeTopPiece,
    type GameState
} from "./state.js"
import { hexToKey, hexEquals, getNeighbors, keyToHex } from "./grid/hex.js"

export type Move =
    | { type : 'place', piece : PieceType, to : Hex }
    | { type : 'move', from : Hex, to : Hex }
    | { type : 'pass' }   // only when the player has no other legal move

const QUEEN_DEADLINE_TURN = 4

function getLegalPlacements(state : GameState, color : Color) : Hex[]{
    const legal : Set<string> = new Set()
    const oppColor = getOpponent(color)

    if (state.board.size == 0){ // first tile (goes on 0,0)
        return [{ q: 0, r: 0 }];
    }

    if (state.board.size == 1){ // second tile (must be a neighbor of the first)
        return getNeighbors({ q: 0, r: 0 })
    }

    // all others must touch an own piece, the hex must be empty and must not touch an opponent's piece
    for(const position of state.board.keys()){
        const hex = keyToHex(position)
        const neighbors = getNeighbors(hex)

        for(const neighbor of neighbors){
            if (!isHexOccupied(state, neighbor)
                && !isTouchingColor(state, neighbor, oppColor)
                && isTouchingColor(state, neighbor, color)){
                legal.add(hexToKey(neighbor))
            }
        }

    }
    return Array.from(legal, keyToHex)
}

// everywhere the top piece at from can go
function getMovementTargets(state : GameState, from : Hex) : Hex[]{
    const piece = getTopPiece(state, from)
    if (!piece) return []

    // One Hive: the hive must not split when the piece is lifted
    const without = removeTopPiece(state, from)
    if (!isHiveConnected(without)) return []

    return PIECE_MOVES[piece.type](without, from)
}

export function getLegalMoves(state : GameState) : Move[]{
    if (getStatus(state).kind != 'ongoing') return []

    const color = getCurrentColor(state)
    const playerTurn = getPlayerTurn(state)
    const queenPlaced = isQueenPlaced(state, color)
    const moves : Move[] = []

    let placeable = new Set(state.hands[color].map(p => p.type))
    if (playerTurn == 1){
        placeable.delete('queen')   // tournament rule: no queen on the first turn
    }
    if (playerTurn == QUEEN_DEADLINE_TURN && !queenPlaced){
        placeable = new Set(['queen'])   // the queen must be placed by the 4th turn at the latest
    }

    if (placeable.size > 0){
        const targets = getLegalPlacements(state, color)
        for (const piece of placeable){
            for (const to of targets){
                moves.push({ type : 'place', piece, to })
            }
        }
    }

    // pieces may move only after the queen is placed
    if (queenPlaced){
        for (const [key, stack] of state.board){
            if (stack.at(-1)?.color != color) continue

            const from = keyToHex(key)
            for (const to of getMovementTargets(state, from)){
                moves.push({ type : 'move', from, to })
            }
        }
    }

    if (moves.length == 0){
        return [{ type : 'pass' }]
    }
    return moves
}

function movesEqual(a : Move, b : Move) : boolean{
    if (a.type == 'pass' || b.type == 'pass') return a.type == b.type
    if (a.type == 'place' && b.type == 'place') return a.piece == b.piece && hexEquals(a.to, b.to)
    if (a.type == 'move' && b.type == 'move') return hexEquals(a.from, b.from) && hexEquals(a.to, b.to)
    return false
}

// returns a NEW state, the old one stays unchanged
export function applyMove(state : GameState, move : Move) : GameState{
    if (!getLegalMoves(state).some(m => movesEqual(m, move))){
        throw new Error('Illegal move')
    }

    const color = getCurrentColor(state)
    let next : GameState

    if (move.type == 'place'){
        next = cloneState(state)
        const hand = next.hands[color]
        const index = hand.findIndex(p => p.type == move.piece)
        const [piece] = hand.splice(index, 1)
        if (!piece) {throw new Error('Piece not in hand')}

        next.board.set(hexToKey(move.to), [piece])
    }else if (move.type == 'move'){
        const piece = getTopPiece(state, move.from)
        if (!piece) {throw new Error('No piece on this hex')}

        next = removeTopPiece(state, move.from)
        const toKey = hexToKey(move.to)
        next.board.set(toKey, [...(next.board.get(toKey) ?? []), piece])
    }else{
        next = cloneState(state)
    }

    next.turn += 1
    return next
}
