export type Visibility = 'public' | 'private'

export type RoomSummary = {
    roomId : string,
    visibility : Visibility,
    players : number,
    inMatch : boolean
}

export type JoinResponse = {
    token : string,
    role : 'player' | 'spectator',
    playerId : string,
    roomId : string
}

async function request<T>(method : string, path : string, body? : unknown, token? : string) : Promise<T>{
    const headers : Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(path, {
        method,
        headers,
        body : body === undefined ? null : JSON.stringify(body)
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {throw new Error(data?.error ?? `HTTP ${res.status}`)}
    return data as T
}

export function createRoom(visibility : Visibility){
    return request<RoomSummary>('POST', '/rooms', { visibility })
}

export function listRooms(){
    return request<RoomSummary[]>('GET', '/rooms')
}

// React in dev mode (StrictMode) runs effects twice; the same join isn't sent twice
const pendingJoins : Map<string, Promise<JoinResponse>> = new Map()

export function joinRoom(roomId : string) : Promise<JoinResponse>{
    const pending = pendingJoins.get(roomId)
    if (pending) return pending

    // one room per tab: leave the previous room before taking a seat in a new one
    const promise = leaveOtherRooms(roomId)
        .then(() => request<JoinResponse>('POST', `/rooms/${roomId}/join`))
        .finally(() => pendingJoins.delete(roomId))
    pendingJoins.set(roomId, promise)
    return promise
}

export function leaveRoom(session : JoinResponse){
    return request<void>('POST', `/rooms/${session.roomId}/leave`, undefined, session.token)
}

// errors are ignored: the old room may already be gone (404) or the token expired (401)
async function leaveOtherRooms(keepRoomId : string){
    const others = loadAllSessions().filter(s => s.roomId != keepRoomId)
    await Promise.allSettled(others.map(leaveRoom))
    for (const session of others) clearSession(session.roomId)
}

export function webSocketUrl(token : string) : string{
    const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
}

// the room token is kept in sessionStorage, so a page refresh puts the player back in the same seat
const SESSION_PREFIX = 'buzzd:room:'
const sessionKey = (roomId : string) => `${SESSION_PREFIX}${roomId}`

export function loadSession(roomId : string) : JoinResponse | undefined{
    try {
        const raw = sessionStorage.getItem(sessionKey(roomId))
        return raw ? JSON.parse(raw) as JoinResponse : undefined
    } catch {
        return undefined
    }
}

function loadAllSessions() : JoinResponse[]{
    const sessions : JoinResponse[] = []
    try {
        for (let i = 0; i < sessionStorage.length; i++){
            const key = sessionStorage.key(i)
            if (!key?.startsWith(SESSION_PREFIX)) continue
            const session = loadSession(key.slice(SESSION_PREFIX.length))
            if (session) sessions.push(session)
        }
    } catch {
        // no sessionStorage: nothing saved, nothing to leave
    }
    return sessions
}

export function saveSession(session : JoinResponse){
    try {
        sessionStorage.setItem(sessionKey(session.roomId), JSON.stringify(session))
    } catch {
        // without sessionStorage there's just no rejoin after a refresh
    }
}

export function clearSession(roomId : string){
    try {
        sessionStorage.removeItem(sessionKey(roomId))
    } catch {
        // same as above
    }
}
