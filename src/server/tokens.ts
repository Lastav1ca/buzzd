import jwt from "jsonwebtoken"
import { config } from "./config.js"

export type Role = 'player' | 'spectator'

// token for a single room, independent of the login token
export type RoomToken = {
    playerId : string,
    userId : string | null,   // null = guest
    roomId : string,
    role : Role
}

export function signRoomToken(token : RoomToken) : string{
    return jwt.sign(token, config.jwtSecret, { expiresIn : config.roomTokenTtlSeconds })
}

export function verifyRoomToken(raw : string) : RoomToken | undefined{
    try {
        const payload = jwt.verify(raw, config.jwtSecret)
        if (typeof payload == 'string') return undefined

        const { playerId, userId, roomId, role } = payload
        if (typeof playerId != 'string' || typeof roomId != 'string') return undefined
        if (userId !== null && typeof userId != 'string') return undefined
        if (role != 'player' && role != 'spectator') return undefined

        return { playerId, userId, roomId, role }
    } catch {
        return undefined
    }
}
