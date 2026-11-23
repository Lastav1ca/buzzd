import { useCallback, useEffect, useState, type FormEvent } from "react"
import { navigate } from "../router.js"
import { createRoom, listRooms, type RoomSummary, type Visibility } from "../api.js"

const REFRESH_MS = 5000

export function Lobby(){
    const [rooms, setRooms] = useState<RoomSummary[]>([])
    const [visibility, setVisibility] = useState<Visibility>('public')
    const [joinInput, setJoinInput] = useState('')
    const [error, setError] = useState<string | undefined>(undefined)
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(() => {
        listRooms().then(setRooms).catch(err => setError(err.message))
    }, [])

    useEffect(() => {
        refresh()
        const timer = setInterval(refresh, REFRESH_MS)
        return () => clearInterval(timer)
    }, [refresh])

    async function onCreate(){
        setBusy(true)
        setError(undefined)
        try {
            const room = await createRoom(visibility)
            navigate(`/room/${room.roomId}`)
        } catch (err){
            setError(err instanceof Error ? err.message : 'Error')
            setBusy(false)
        }
    }

    // accepts a full link or just the room id
    function onJoin(event : FormEvent){
        event.preventDefault()
        const id = joinInput.trim().split('/').pop()
        if (id) navigate(`/room/${id}`)
    }

    return (
        <div className="lobby">
            <section className="card">
                <h2>New room</h2>
                <div className="segmented" role="radiogroup" aria-label="Visibility">
                    <button type="button" className={visibility == 'public' ? 'is-active' : ''} onClick={() => setVisibility('public')}>
                        Public
                    </button>
                    <button type="button" className={visibility == 'private' ? 'is-active' : ''} onClick={() => setVisibility('private')}>
                        Private
                    </button>
                </div>
                <p className="hint">
                    {visibility == 'public' ? 'Is displayed in room browser' : 'Can only join through access link'}
                </p>
                <button type="button" className="primary" onClick={onCreate} disabled={busy}>
                    Create room
                </button>
            </section>

            <section className="card">
                <h2>Join through link</h2>
                <form className="join-form" onSubmit={onJoin}>
                    <input
                        value={joinInput}
                        onChange={e => setJoinInput(e.target.value)}
                        placeholder="Link or room id"
                        aria-label="Link or room id"
                    />
                    <button type="submit" disabled={!joinInput.trim()}>Join</button>
                </form>
            </section>

            <section className="card lobby-rooms">
                <div className="card-header">
                    <h2>Open rooms</h2>
                    <button type="button" className="ghost" onClick={refresh}>Refresh</button>
                </div>
                {rooms.length == 0
                    ? <p className="hint">No open rooms. Create your own.</p>
                    : (
                        <ul className="room-list">
                            {rooms.map(room => (
                                <li key={room.roomId}>
                                    <span>Room {room.roomId.slice(0, 8)}</span>
                                    <span className="hint">{room.players}/2 players</span>
                                    <button type="button" onClick={() => navigate(`/room/${room.roomId}`)}>Join</button>
                                </li>
                            ))}
                        </ul>
                    )}
            </section>

            {error && <p className="error">{error}</p>}
        </div>
    )
}
