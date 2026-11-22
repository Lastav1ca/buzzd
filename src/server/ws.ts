import type { Server } from "node:http"
import { WebSocketServer } from "ws"
import { parseClientMessage } from "./protocol.js"
import type { RoomManager } from "./roomManager.js"
import { verifyRoomToken } from "./tokens.js"

// kodovi za zatvaranje konekcije (4000-4999 su slobodni za aplikaciju)
const CLOSE_INVALID_TOKEN = 4001
const CLOSE_NOT_ALLOWED = 4003
const CLOSE_ROOM_NOT_FOUND = 4004

export function attachWebSocket(server : Server, rooms : RoomManager){
    const wss = new WebSocketServer({ server, path : '/ws' })

    wss.on('connection', (socket, req) => {
        // browser ne moze da posalje zaglavlja, pa token stize u URL-u
        const url = new URL(req.url ?? '', 'http://localhost')
        const token = verifyRoomToken(url.searchParams.get('token') ?? '')
        if (!token){
            socket.close(CLOSE_INVALID_TOKEN, 'Invalid token')
            return
        }

        const room = rooms.get(token.roomId)
        if (!room){
            socket.close(CLOSE_ROOM_NOT_FOUND, 'Room not found')
            return
        }

        try {
            room.connect(token, socket)
        } catch (err){
            socket.close(CLOSE_NOT_ALLOWED, errorMessage(err))
            return
        }

        socket.on('message', data => {
            try {
                room.handleMessage(token, socket, parseClientMessage(data.toString()))
            } catch (err){
                socket.send(JSON.stringify({ type : 'error', message : errorMessage(err) }))
            }
        })

        socket.on('close', () => room.disconnect(token, socket))
    })

    return wss
}

function errorMessage(err : unknown) : string{
    return err instanceof Error ? err.message : 'Unknown error'
}
