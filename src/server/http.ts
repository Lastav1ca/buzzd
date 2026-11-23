import express, { type ErrorRequestHandler, type Request } from "express"
import type { RoomManager } from "./roomManager.js"
import { signRoomToken, verifyRoomToken, type Role } from "./tokens.js"

// login doesn't exist yet, so everyone is a guest for now
function getUserIdFromLogin(_req : Request) : string | null{
    return null
}

export function createHttpApp(rooms : RoomManager){
    const app = express()
    app.use(express.json())

    app.get('/healthz', (_req, res) => {
        res.json({ status : 'ok' })
    })

    app.post('/rooms', (req, res) => {
        const visibility = req.body?.visibility
        if (visibility != 'public' && visibility != 'private'){
            res.status(400).json({ error : 'visibility must be "public" or "private"' })
            return
        }

        const room = rooms.create(visibility)
        res.status(201).json(room.getSummary())
    })

    app.get('/rooms', (_req, res) => {
        res.json(rooms.listPublic().map(r => r.getSummary()))
    })

    app.post('/rooms/:id/join', (req, res) => {
        const room = rooms.get(req.params.id)
        if (!room){
            res.status(404).json({ error : 'Room not found' })
            return
        }

        const userId = getUserIdFromLogin(req)
        const playerId = userId ?? `guest-${crypto.randomUUID()}`
        // the same logged-in user gets their seat back; otherwise player if there is a free seat, spectator if not
        const role : Role = room.hasPlayer(playerId) || room.hasFreeSeat() ? 'player' : 'spectator'

        if (role == 'player') room.addPlayer(playerId, userId)

        const token = signRoomToken({ playerId, userId, roomId : room.id, role })
        res.json({ token, role, playerId, roomId : room.id })
    })

    app.post('/rooms/:id/leave', (req, res) => {
        const raw = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
        const token = raw ? verifyRoomToken(raw.trim()) : undefined
        if (!token){
            res.status(401).json({ error : 'Missing or invalid room token' })
            return
        }
        if (token.roomId != req.params.id){
            res.status(403).json({ error : 'Token is for a different room' })
            return
        }

        const room = rooms.get(req.params.id)
        if (!room){
            res.status(404).json({ error : 'Room not found' })
            return
        }

        if (token.role == 'player') room.leave(token.playerId)
        res.status(204).end()
    })

    const handleError : ErrorRequestHandler = (err, _req, res, _next) => {
        const status = typeof err?.status == 'number' ? err.status : 500
        if (status == 500) console.error(err)
        res.status(status).json({ error : status == 500 ? 'Internal server error' : err.message })
    }
    app.use(handleError)

    return app
}
