import { applyMove, getLegalMoves, type Move } from "../engine/moves.js"
import { formatMove } from "../engine/moveNotation.js"
import { getOpponent, type Color } from "../engine/pieces/types.js"
import { createInitialState, getCurrentColor, type GameState } from "../engine/state.js"
import { getStatus as getGameStatus } from "../engine/status.js"

export type MatchStatus = 'waiting' | 'ongoing' | 'finished'

export type MatchResult =
    | { kind : 'win', winner : Color, reason : 'queen' | 'resign' }
    | { kind : 'draw' }
    | { kind : 'aborted' }

// poziva se kad se mec zavrsi (ovde ce se kasnije upisivati u bazu)
export type MatchEndHandler = (match : Match) => void

// jedna sesija igre izmedju dva igraca
export class Match {
    readonly id : string
    readonly players : Record<Color, string>   // boja → id igraca

    private state : GameState = createInitialState()
    private history : string[] = []             // potezi u notaciji
    private status : MatchStatus = 'waiting'
    private result : MatchResult | undefined
    private onEnd : MatchEndHandler

    constructor(id : string, whiteId : string, blackId : string, onEnd : MatchEndHandler){
        this.id = id
        this.players = { white : whiteId, black : blackId }
        this.onEnd = onEnd
    }

    // pokrece mec od pocetka; posle zavrsenog meca radi kao reset
    start(){
        if (this.status == 'ongoing') {throw new Error('Match is already running')}

        this.state = createInitialState()
        this.history = []
        this.result = undefined
        this.status = 'ongoing'
    }

    // prekid bez pobednika (npr. igrac napustio igru)
    stop(){
        this.ensureOngoing()
        this.finish({ kind : 'aborted' })
    }

    resign(playerId : string){
        this.ensureOngoing()
        const color = this.getPlayerColor(playerId)
        this.finish({ kind : 'win', winner : getOpponent(color), reason : 'resign' })
    }

    playMove(playerId : string, move : Move){
        this.ensureOngoing()
        if (this.getCurrentPlayer() != playerId) {throw new Error('Not your turn')}

        // applyMove baca gresku za nelegalan potez, pa notacija ide tek posle provere
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
