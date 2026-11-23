import type { Move } from "../../src/engine/moves.js"
import type { Color, Piece } from "../../src/engine/pieces/types.js"

export type { ClientMessage, ColorChoice } from "../../src/server/protocol.js"

// the board arrives as an array of [key "q,r", stack of pieces] pairs
export type SerializedState = {
    board : [string, Piece[]][],
    hands : Record<Color, Piece[]>,
    turn : number
}

export type RoomPlayer = {
    playerId : string,
    isGuest : boolean,
    colorChoice : Color | 'random',
    ready : boolean,
    connected : boolean
}

export type RoomState = {
    type : 'room_state',
    roomId : string,
    visibility : 'public' | 'private',
    players : RoomPlayer[],
    spectators : number,
    matchId : string | null,
    matchStatus : 'waiting' | 'ongoing' | 'finished' | null
}

export type MatchResult =
    | { kind : 'win', winner : Color, reason : 'queen' | 'resign' | 'disconnect' }
    | { kind : 'draw' }
    | { kind : 'aborted' }

export type MatchSnapshot = {
    matchId : string,
    players : Record<Color, string>,
    status : 'waiting' | 'ongoing' | 'finished',
    state : SerializedState,
    history : string[],
    currentPlayer : string,
    legalMoves : Move[]
}

export type ServerMessage =
    | RoomState
    | ({ type : 'match_started' } & MatchSnapshot)
    | ({ type : 'match_state' } & MatchSnapshot)
    | { type : 'move_played', notation : string, state : SerializedState, currentPlayer : string, legalMoves : Move[] }
    | { type : 'match_ended', matchId : string, result : MatchResult, history : string[] }
    | { type : 'player_disconnected', playerId : string, seconds : number }
    | { type : 'player_reconnected', playerId : string }
    | { type : 'error', message : string }
