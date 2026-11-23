import { useCallback, useEffect, useRef, useState } from "react"
import { clearSession, joinRoom, loadSession, saveSession, webSocketUrl, type JoinResponse } from "./api.js"
import type { ClientMessage, MatchResult, MatchSnapshot, RoomState, ServerMessage } from "./protocol.js"

export type MatchView = MatchSnapshot & { result : MatchResult | undefined }

export type RoomConnection = {
    status : 'connecting' | 'open' | 'closed',
    error : string | undefined,
    me : JoinResponse | undefined,
    room : RoomState | undefined,
    match : MatchView | undefined,
    notice : string | undefined,   // last error from the server (e.g. illegal move)
    away : { playerId : string, until : number } | undefined   // opponent lost connection
}

const INITIAL : RoomConnection = {
    status : 'connecting',
    error : undefined,
    me : undefined,
    room : undefined,
    match : undefined,
    notice : undefined,
    away : undefined
}

// close codes from the server
const CLOSE_MESSAGES : Record<number, string> = {
    4000 : 'Room is open in another tab',
    4004 : 'Room doesnt exist'
}

function applyMessage(conn : RoomConnection, message : ServerMessage) : RoomConnection{
    switch (message.type){
        case 'room_state':
            return { ...conn, room : message }
        case 'match_started':
        case 'match_state': {
            const { type, ...snapshot } = message
            return { ...conn, match : { ...snapshot, result : undefined }, away : undefined }
        }
        case 'move_played':
            if (!conn.match) return conn
            return {
                ...conn,
                match : {
                    ...conn.match,
                    state : message.state,
                    currentPlayer : message.currentPlayer,
                    legalMoves : message.legalMoves,
                    history : [...conn.match.history, message.notation]
                }
            }
        case 'match_ended':
            if (!conn.match || conn.match.matchId != message.matchId) return conn
            return {
                ...conn,
                match : { ...conn.match, status : 'finished', result : message.result, history : message.history, legalMoves : [] },
                away : undefined
            }
        case 'player_disconnected':
            return { ...conn, away : { playerId : message.playerId, until : Date.now() + message.seconds * 1000 } }
        case 'player_reconnected':
            return { ...conn, away : undefined }
        case 'error':
            return { ...conn, notice : message.message }
    }
}

export function useRoom(roomId : string){
    const [conn, setConn] = useState<RoomConnection>(INITIAL)
    const socketRef = useRef<WebSocket | undefined>(undefined)

    useEffect(() => {
        let cancelled = false

        async function connect(useSaved : boolean){
            let session = useSaved ? loadSession(roomId) : undefined
            if (!session){
                try {
                    session = await joinRoom(roomId)
                } catch (err){
                    if (!cancelled) setConn(c => ({ ...c, status : 'closed', error : errorMessage(err) }))
                    return
                }
                saveSession(session)
            }
            if (cancelled) return

            const me = session
            setConn(c => ({ ...c, me }))

            const socket = new WebSocket(webSocketUrl(me.token))
            socketRef.current = socket

            socket.onopen = () => {
                if (!cancelled) setConn(c => ({ ...c, status : 'open', error : undefined }))
            }
            socket.onmessage = event => {
                if (cancelled) return
                const message = JSON.parse(event.data) as ServerMessage
                setConn(c => applyMessage(c, message))
            }
            socket.onclose = event => {
                if (cancelled) return

                // saved token expired or the seat no longer exists: join again
                if (useSaved && (event.code == 4001 || event.code == 4003)){
                    clearSession(roomId)
                    connect(false)
                    return
                }
                if (event.code == 4004) clearSession(roomId)

                setConn(c => ({
                    ...c,
                    status : 'closed',
                    error : (CLOSE_MESSAGES[event.code] ?? event.reason) || 'Connection with server closed'
                }))
            }
        }

        connect(true)

        return () => {
            cancelled = true
            socketRef.current?.close()
            socketRef.current = undefined
        }
    }, [roomId])

    // the error message disappears after a few seconds
    useEffect(() => {
        if (!conn.notice) return
        const timer = setTimeout(() => setConn(c => ({ ...c, notice : undefined })), 4000)
        return () => clearTimeout(timer)
    }, [conn.notice])

    const send = useCallback((message : ClientMessage) => {
        const socket = socketRef.current
        if (socket?.readyState == WebSocket.OPEN) socket.send(JSON.stringify(message))
    }, [])

    const leave = useCallback(() => {
        send({ type : 'leave' })
        clearSession(roomId)
    }, [roomId, send])

    return { conn, send, leave }
}

function errorMessage(err : unknown) : string{
    return err instanceof Error ? err.message : 'Unknown error'
}
