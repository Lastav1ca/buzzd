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

async function request<T>(method : string, path : string, body? : unknown) : Promise<T>{
    const res = await fetch(path, {
        method,
        headers : body === undefined ? {} : { 'Content-Type' : 'application/json' },
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

    const promise = request<JoinResponse>('POST', `/rooms/${roomId}/join`)
        .finally(() => pendingJoins.delete(roomId))
    pendingJoins.set(roomId, promise)
    return promise
}

export function webSocketUrl(token : string) : string{
    const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
}

// the room token is kept in sessionStorage, so a page refresh puts the player back in the same seat
const sessionKey = (roomId : string) => `buzzd:room:${roomId}`

export function loadSession(roomId : string) : JoinResponse | undefined{
    try {
        const raw = sessionStorage.getItem(sessionKey(roomId))
        return raw ? JSON.parse(raw) as JoinResponse : undefined
    } catch {
        return undefined
    }
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
