import { WebSocket } from "ws"
import type { Color } from "../engine/pieces/types.js"
import type { Match } from "../match/match.js"
import type { MatchManager } from "../match/matchManager.js"
import { assignColors } from "./colors.js"
import { config } from "./config.js"
import { serializeState, type ClientMessage, type ColorChoice } from "./protocol.js"
import type { RoomToken } from "./tokens.js"

export type Visibility = 'public' | 'private'

type PlayerSlot = {
    playerId : string,
    userId : string | null,
    colorChoice : ColorChoice,
    ready : boolean,
    socket : WebSocket | undefined,
    timer : NodeJS.Timeout | undefined   // rok da se poveze / vrati
}

const MAX_PLAYERS = 2

// soba sa 2 mesta za igrace i posmatracima; u njoj se igra vise meceva zaredom
export class Room {
    readonly id : string
    readonly visibility : Visibility

    private players : PlayerSlot[] = []
    private spectators : Set<WebSocket> = new Set()
    private match : Match | undefined
    private matchUserIds : Record<Color, string | null> | undefined
    private emptyTimer : NodeJS.Timeout | undefined
    private matches : MatchManager
    private onClose : (room : Room) => void

    constructor(id : string, visibility : Visibility, matches : MatchManager, onClose : (room : Room) => void){
        this.id = id
        this.visibility = visibility
        this.matches = matches
        this.onClose = onClose

        // soba u koju niko ne udje se brise
        this.emptyTimer = setTimeout(() => {
            if (this.players.length == 0) this.close()
        }, config.reconnectTimeoutMs)
    }

    hasFreeSeat() : boolean{
        return this.players.length < MAX_PLAYERS
    }

    hasPlayer(playerId : string) : boolean{
        return this.players.some(p => p.playerId == playerId)
    }

    getMatchId() : string | undefined{
        return this.match?.id
    }

    getMatchUserIds() : Record<Color, string | null> | undefined{
        return this.matchUserIds
    }

    getSummary(){
        return {
            roomId : this.id,
            visibility : this.visibility,
            players : this.players.length,
            inMatch : this.isMatchOngoing()
        }
    }

    // HTTP join rezervise mesto; ako se igrac ne poveze preko WebSocket-a na vreme, mesto se oslobadja
    addPlayer(playerId : string, userId : string | null){
        if (this.hasPlayer(playerId)) return
        if (!this.hasFreeSeat()) {throw new Error('Room is full')}

        clearTimeout(this.emptyTimer)
        const slot : PlayerSlot = { playerId, userId, colorChoice : 'random', ready : false, socket : undefined, timer : undefined }
        this.players.push(slot)
        this.startReconnectTimer(slot, false)
        this.broadcastRoomState()
    }

    connect(token : RoomToken, socket : WebSocket){
        if (token.role == 'spectator'){
            this.spectators.add(socket)
            this.sendInitialState(socket)
            return
        }

        const slot = this.getSlot(token.playerId)
        if (!slot) {throw new Error('Seat expired, join the room again')}

        // isti igrac iz drugog taba: stara konekcija se zatvara
        const previous = slot.socket
        slot.socket = socket
        previous?.close(4000, 'Connected from another place')

        const wasAway = slot.timer != undefined && this.isMatchOngoing() && this.match?.hasPlayer(slot.playerId)
        clearTimeout(slot.timer)
        slot.timer = undefined

        if (wasAway) this.broadcast({ type : 'player_reconnected', playerId : slot.playerId })
        this.sendInitialState(socket)
        this.broadcastRoomState()
    }

    disconnect(token : RoomToken, socket : WebSocket){
        if (token.role == 'spectator'){
            this.spectators.delete(socket)
            return
        }

        const slot = this.getSlot(token.playerId)
        if (!slot || slot.socket !== socket) return   // vec zamenjena konekcija

        slot.socket = undefined
        const inMatch = this.isMatchOngoing() && this.match?.hasPlayer(slot.playerId)
        // diskonekcija pre prvog poteza samo prekida mec
        const noMovesYet = this.match?.getHistory().length == 0

        if (inMatch){
            this.broadcast({ type : 'player_disconnected', playerId : slot.playerId, seconds : config.reconnectTimeoutMs / 1000 })
        }
        this.startReconnectTimer(slot, noMovesYet)
        this.broadcastRoomState()
    }

    handleMessage(token : RoomToken, socket : WebSocket, message : ClientMessage){
        if (token.role == 'spectator') {throw new Error('Spectators can only watch')}

        const slot = this.getSlot(token.playerId)
        if (!slot || slot.socket !== socket) {throw new Error('Not connected as a player in this room')}

        switch (message.type){
            case 'choose_color':
                this.ensureNoMatch()
                slot.colorChoice = message.color
                this.broadcastRoomState()
                break
            case 'ready':
                this.ensureNoMatch()
                slot.ready = true
                this.broadcastRoomState()
                this.tryStartMatch()
                break
            case 'unready':
                this.ensureNoMatch()
                slot.ready = false
                this.broadcastRoomState()
                break
            case 'move': {
                const match = this.requireMatch()
                match.playMove(slot.playerId, message.move)
                this.broadcast({
                    type : 'move_played',
                    notation : match.getHistory().at(-1),
                    state : serializeState(match.getState()),
                    currentPlayer : match.getCurrentPlayer(),
                    legalMoves : match.getLegalMoves()
                })
                this.afterMatchAction()
                break
            }
            case 'resign':
                this.requireMatch().resign(slot.playerId)
                this.afterMatchAction()
                break
            case 'leave':
                this.removePlayer(slot, 'resign', this.match?.getHistory().length == 0)
                socket.close(1000, 'Left the room')
                break
        }
    }

    private tryStartMatch(){
        const [a, b] = this.players
        if (!a || !b) return
        if (!a.ready || !b.ready || !a.socket || !b.socket) return

        const colors = assignColors(
            { playerId : a.playerId, choice : a.colorChoice },
            { playerId : b.playerId, choice : b.colorChoice }
        )
        const userIdOf = (playerId : string) => this.getSlot(playerId)?.userId ?? null

        this.match = this.matches.create(colors.white, colors.black)
        this.matchUserIds = { white : userIdOf(colors.white), black : userIdOf(colors.black) }
        this.match.start()

        for (const player of this.players) player.ready = false

        this.broadcast({ type : 'match_started', ...this.getMatchSnapshot(this.match) })
        this.broadcastRoomState()
    }

    // posle poteza ili predaje: ako je mec gotov, javi svima
    private afterMatchAction(){
        const match = this.match
        if (!match || match.getStatus() != 'finished') return

        this.broadcast({ type : 'match_ended', matchId : match.id, result : match.getResult(), history : match.getHistory() })
        this.broadcastRoomState()
    }

    // leave = predaja, istekao rok za povratak = poraz zbog diskonekcije; pre prvog poteza mec se samo prekida
    private removePlayer(slot : PlayerSlot, reason : 'resign' | 'disconnect', noMovesYet : boolean){
        clearTimeout(slot.timer)

        if (this.match && this.isMatchOngoing() && this.match.hasPlayer(slot.playerId)){
            if (noMovesYet) this.match.stop()
            else if (reason == 'resign') this.match.resign(slot.playerId)
            else this.match.forfeit(slot.playerId)
            this.afterMatchAction()
        }

        this.players = this.players.filter(p => p !== slot)
        if (this.players.length == 0){
            this.close()
            return
        }

        // preostali igrac ceka novog protivnika
        for (const player of this.players) player.ready = false
        this.broadcastRoomState()
    }

    private startReconnectTimer(slot : PlayerSlot, noMovesYet : boolean){
        clearTimeout(slot.timer)
        slot.timer = setTimeout(() => {
            slot.timer = undefined
            if (!slot.socket) this.removePlayer(slot, 'disconnect', noMovesYet)
        }, config.reconnectTimeoutMs)
    }

    private close(){
        clearTimeout(this.emptyTimer)
        for (const socket of this.spectators) socket.close(1000, 'Room closed')
        this.spectators.clear()
        this.onClose(this)
    }

    private isMatchOngoing() : boolean{
        return this.match?.getStatus() == 'ongoing'
    }

    private ensureNoMatch(){
        if (this.isMatchOngoing()) {throw new Error('Match is in progress')}
    }

    private requireMatch() : Match{
        if (!this.match || !this.isMatchOngoing()) {throw new Error('No match in progress')}
        return this.match
    }

    private getSlot(playerId : string) : PlayerSlot | undefined{
        return this.players.find(p => p.playerId == playerId)
    }

    private getMatchSnapshot(match : Match){
        return {
            matchId : match.id,
            players : match.players,
            status : match.getStatus(),
            state : serializeState(match.getState()),
            history : match.getHistory(),
            currentPlayer : match.getCurrentPlayer(),
            legalMoves : match.getLegalMoves()
        }
    }

    // pri (ponovnom) povezivanju klijent dobija stanje sobe i meca koji je u toku
    private sendInitialState(socket : WebSocket){
        send(socket, this.getRoomState())
        if (this.match && this.isMatchOngoing()){
            send(socket, { type : 'match_state', ...this.getMatchSnapshot(this.match) })
        }
    }

    private getRoomState(){
        return {
            type : 'room_state',
            roomId : this.id,
            visibility : this.visibility,
            players : this.players.map(p => ({
                playerId : p.playerId,
                isGuest : p.userId == null,
                colorChoice : p.colorChoice,
                ready : p.ready,
                connected : p.socket != undefined
            })),
            spectators : this.spectators.size,
            matchId : this.match?.id ?? null,
            matchStatus : this.match?.getStatus() ?? null
        }
    }

    private broadcastRoomState(){
        this.broadcast(this.getRoomState())
    }

    private broadcast(message : object){
        for (const player of this.players){
            if (player.socket) send(player.socket, message)
        }
        for (const socket of this.spectators) send(socket, message)
    }
}

function send(socket : WebSocket, message : object){
    if (socket.readyState == WebSocket.OPEN){
        socket.send(JSON.stringify(message))
    }
}
