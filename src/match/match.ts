import { applyMove, getLegalMoves, type Move } from "../engine/moves.js"
import { formatMove } from "../engine/moveNotation.js"
import { getOpponent, type Color } from "../engine/pieces/types.js"
import { createInitialState, getCurrentColor, type GameState } from "../engine/state.js"
import { getStatus as getGameStatus } from "../engine/status.js"

export type MatchStatus = 'waiting' | 'ongoing' | 'finished'

export type MatchResult =
    | { kind : 'win', winner : Color, reason : 'queen' | 'resign' | 'disconnect' }
    | { kind : 'draw' }
    | { kind : 'aborted' }

// called when the match ends (the server saves the match to the database here)
export type MatchEndHandler = (match : Match) => void

// one game session between two players
export class Match {
    readonly id : string
    readonly players : Record<Color, string>   // color → player id

    private state : GameState = createInitialState()
    private history : string[] = []             // moves in notation
    private status : MatchStatus = 'waiting'
    private result : MatchResult | undefined
    private startedAt : Date | undefined
    private onEnd : MatchEndHandler

    constructor(id : string, whiteId : string, blackId : string, onEnd : MatchEndHandler){
        this.id = id
        this.players = { white : whiteId, black : blackId }
        this.onEnd = onEnd
    }

    // starts the match from the beginning; after a finished match it acts as a reset
    start(){
        if (this.status == 'ongoing') {throw new Error('Match is already running')}

        this.state = createInitialState()
        this.history = []
        this.result = undefined
        this.startedAt = new Date()
        this.status = 'ongoing'
    }

    // abort without a winner (e.g. a player left the game)
    stop(){
        this.ensureOngoing()
        this.finish({ kind : 'aborted' })
    }

    resign(playerId : string){
        this.ensureOngoing()
        const color = this.getPlayerColor(playerId)
        this.finish({ kind : 'win', winner : getOpponent(color), reason : 'resign' })
    }

    // loss because the player didn't come back after a disconnect
    forfeit(playerId : string){
        this.ensureOngoing()
        const color = this.getPlayerColor(playerId)
        this.finish({ kind : 'win', winner : getOpponent(color), reason : 'disconnect' })
    }

    playMove(playerId : string, move : Move){
        this.ensureOngoing()
        if (this.getCurrentPlayer() != playerId) {throw new Error('Not your turn')}

        // applyMove throws on an illegal move, so notation is added only after the check
        const next = applyMove(this.state, move)
        this.history.push(formatMove(this.state, move))
        this.state = next

        const gameStatus = getGameStatus(this.state)
        if (gameStatus.kind == 'win'){
            this.finish({ kind : 'win', winner : gameStatus.winner, reason : 'queen' })
        }else if (gameStatus.kind == 'draw'){
            this.finish({ kind : 'draw' })
        }
    }

    getState() : GameState{
        return this.state
    }

    getHistory() : string[]{
        return [...this.history]
    }

    getStatus() : MatchStatus{
        return this.status
    }

    getResult() : MatchResult | undefined{
        return this.result
    }

    getStartedAt() : Date | undefined{
        return this.startedAt
    }

    hasPlayer(playerId : string) : boolean{
        return this.players.white == playerId || this.players.black == playerId
    }

    getCurrentPlayer() : string{
        return this.players[getCurrentColor(this.state)]
    }

    getLegalMoves() : Move[]{
        if (this.status != 'ongoing') return []
        return getLegalMoves(this.state)
    }

    private getPlayerColor(playerId : string) : Color{
        if (this.players.white == playerId) return 'white'
        if (this.players.black == playerId) return 'black'
        throw new Error('Player is not in this match')
    }

    private ensureOngoing(){
        if (this.status != 'ongoing') {throw new Error('Match is not running')}
    }

    private finish(result : MatchResult){
        this.status = 'finished'
        this.result = result
        this.onEnd(this)
    }
}
