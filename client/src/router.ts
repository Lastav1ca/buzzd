export type Route = { page : 'lobby' } | { page : 'room', roomId : string }

// hash routes: #/ is the lobby, #/room/<id> is a room
export function parseRoute(hash : string) : Route{
    const match = hash.match(/^#\/room\/([\w-]+)$/)
    if (match?.[1]) return { page : 'room', roomId : match[1] }
    return { page : 'lobby' }
}

export function navigate(path : string){
    window.location.hash = path
}
