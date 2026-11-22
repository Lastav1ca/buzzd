import type { Move } from "../engine/moves.js"
import type { Color } from "../engine/pieces/types.js"
import type { GameState } from "../engine/state.js"

export type ColorChoice = Color | 'random'

// poruke koje klijent salje preko WebSocket-a
export type ClientMessage =
    | { type : 'choose_color', color : ColorChoice }
    | { type : 'ready' }
    | { type : 'unready' }
    | { type : 'move', move : Move }
    | { type : 'resign' }
    | { type : 'leave' }

const COLOR_CHOICES : ColorChoice[] = ['white', 'black', 'random']

// proverava samo oblik poruke; da li je potez legalan proverava engine
export function parseClientMessage(raw : string) : ClientMessage{
    let data : any
    try {
        data = JSON.parse(raw)
    } catch {
        throw new Error('Message is not valid JSON')
    }

    switch (data?.type){
        case 'choose_color':
            if (!COLOR_CHOICES.includes(data.color)) {throw new Error('Invalid color')}
            return { type : 'choose_color', color : data.color }
        case 'move':
            if (typeof data.move != 'object' || data.move == null) {throw new Error('Missing move')}
            return { type : 'move', move : data.move }
        case 'ready':
        case 'unready':
        case 'resign':
        case 'leave':
            return { type : data.type }
        default:
            throw new Error('Unknown message type')
    }
}

// Map se ne serijalizuje u JSON, pa tabla ide kao niz parova [kljuc, stek]
export function serializeState(state : GameState){
    return {
        board : Array.from(state.board),
        hands : state.hands,
        turn : state.turn
    }
}
