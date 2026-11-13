import { getNeighbors, hexToKey, keyToHex, type Hex } from "./grid/hex.js";
import { PIECE_COUNTS, type Color, type Piece, type PieceType } from "./pieces/types.js";

export type Board = Map<string, Piece[]>   // ključ "q,r" → stek figura (zbog bube)

export type GameState = {
  board: Board;
  hands: Record<Color, Piece[]>;     // figure koje još nisu postavljene
  turn: number;                      // 0, 1, 2... beli igra na parnim
};

export function createInitialState() : GameState{
  return {
    board: new Map(),
    hands: { white: createHand('white'), black: createHand('black') },
    turn: 0
  }
}

function createHand(color : Color) : Piece[]{
  const hand : Piece[] = []
  for (const type of Object.keys(PIECE_COUNTS) as PieceType[]){
    for (let i = 0; i < PIECE_COUNTS[type]; i++){
      hand.push({ type, color })
    }
  }
  return hand
}

export function cloneState(state : GameState) : GameState{
  return {
    board: new Map(Array.from(state.board, ([key, stack]) => [key, [...stack]])),
    hands: { white: [...state.hands.white], black: [...state.hands.black] },
    turn: state.turn
  }
}

export function getCurrentColor(state : GameState) : Color{
  return state.turn % 2 == 0 ? 'white' : 'black'
}

// koji je ovo po redu potez igraca koji je na potezu (1, 2, 3...)
export function getPlayerTurn(state : GameState) : number{
  return Math.floor(state.turn / 2) + 1
}

export function isHexOccupied(state : GameState, hex: Hex) : boolean{
  return state.board.has(hexToKey(hex))
}

export function getPiecesAt(state : GameState, hex : Hex) : Piece[]{
  return state.board.get(hexToKey(hex)) ?? []
}

export function getTopPiece(state : GameState, hex : Hex) : Piece | undefined{
  return getPiecesAt(state, hex).at(-1)
}

export function isTouchingColor(state : GameState, hex : Hex, color : Color) : boolean{
  for (const neighbor of getNeighbors(hex)){
    const piece = getTopPiece(state, neighbor)
    if (piece && piece.color == color){
      return true
    }
  }

  return false
}

export function isQueenPlaced(state : GameState, color : Color) : boolean{
  return !state.hands[color].some(p => p.type == 'queen')
}

// kraljica moze biti i ispod bube, pa se gleda ceo stek
export function findQueen(state : GameState, color : Color) : Hex | undefined{
  for (const [key, stack] of state.board){
    if (stack.some(p => p.type == 'queen' && p.color == color)){
      return keyToHex(key)
    }
  }
  return undefined
}

// vraca novo stanje bez gornje figure sa polja; prazan stek se brise iz mape
export function removeTopPiece(state : GameState, hex : Hex) : GameState{
  const next = cloneState(state)
  const key = hexToKey(hex)
  const stack = next.board.get(key)
  if (!stack || stack.length == 0) {throw new Error('No piece on this hex')}

  stack.pop()
  if (stack.length == 0){
    next.board.delete(key)
  }
  return next
}

// One Hive: sve figure moraju biti povezane
export function isHiveConnected(state : GameState) : boolean{
  const first = state.board.keys().next().value
  if (first == undefined) return true

  const visited = new Set([first])
  const queue = [first]
  while (queue.length > 0){
    const current = queue.shift()
    if (current == undefined) break

    for (const neighbor of getNeighbors(keyToHex(current))){
      const key = hexToKey(neighbor)
      if (state.board.has(key) && !visited.has(key)){
        visited.add(key)
        queue.push(key)
      }
    }
  }

  return visited.size == state.board.size
}
