import { useEffect, useState } from "react"
import { hexEquals, hexToKey, type Hex } from "../../../src/engine/grid/hex.js"
import type { Move } from "../../../src/engine/moves.js"
import { getOpponent, type Color, type PieceType } from "../../../src/engine/pieces/types.js"
import { navigate } from "../router.js"
import type { MatchResult, RoomPlayer } from "../protocol.js"
import { useRoom, type MatchView } from "../useRoom.js"
import { Board } from "./Board.js"
import { Hand } from "./Hand.js"

type Selection =
    | { kind : 'hand', piece : PieceType }
    | { kind : 'board', from : Hex }

const COLOR_NAMES : Record<Color, string> = { white : 'White', black : 'Black' }

function displayName(playerId : string, myId : string) : string{
    if (playerId == myId) return 'You'
    return playerId.startsWith('guest-') ? `Guest ${playerId.slice(6, 10)}` : playerId
}

function colorOf(match : MatchView, playerId : string) : Color | undefined{
    if (match.players.white == playerId) return 'white'
    if (match.players.black == playerId) return 'black'
    return undefined
}

function resultText(result : MatchResult) : string{
    switch (result.kind){
        case 'aborted':
            return 'Match was stopped before the first move was made.'
        case 'draw':
            return 'Draw: both queens surrounded'
        case 'win': {
            const reasons = {
                queen : 'queen is surrounded',
                resign : 'withdraw',
                disconnect : 'opponent left'
            }
            return `Winner is ${COLOR_NAMES[result.winner].toLowerCase()} (${reasons[result.reason]}).`
        }
    }
}

export function RoomView({ roomId } : { roomId : string }){
    const { conn, send, leave } = useRoom(roomId)
    const [selection, setSelection] = useState<Selection | undefined>(undefined)
    const { me, room, match } = conn

    // clear the selection after every move
    useEffect(() => setSelection(undefined), [match?.matchId, match?.state.turn])

    if (!me || !room){
        return (
            <div className="card narrow">
                {conn.error
                    ? <><p className="error">{conn.error}</p><a href="#/">Back to lobby</a></>
                    : <p className="hint">Connecting</p>}
            </div>
        )
    }

    const isPlayer = me.role == 'player'
    const myColor = match ? colorOf(match, me.playerId) : undefined
    const ongoing = match?.status == 'ongoing'
    const myTurn = ongoing && match.currentPlayer == me.playerId
    const legal : Move[] = myTurn ? match.legalMoves : []

    const placeable = new Set(legal.flatMap(m => m.type == 'place' ? [m.piece] : []))
    const movable = new Set(legal.flatMap(m => m.type == 'move' ? [hexToKey(m.from)] : []))
    const targets = legal.flatMap(m => {
        if (selection?.kind == 'hand' && m.type == 'place' && m.piece == selection.piece) return [m.to]
        if (selection?.kind == 'board' && m.type == 'move' && hexEquals(m.from, selection.from)) return [m.to]
        return []
    })
    const canOnlyPass = legal.length == 1 && legal[0]?.type == 'pass'

    function onHexClick(hex : Hex){
        if (!selection || !targets.some(t => hexEquals(t, hex))){
            const key = hexToKey(hex)
            const reselect = movable.has(key) && !(selection?.kind == 'board' && hexEquals(selection.from, hex))
            setSelection(reselect ? { kind : 'board', from : hex } : undefined)
            return
        }

        if (selection.kind == 'hand') send({ type : 'move', move : { type : 'place', piece : selection.piece, to : hex } })
        else send({ type : 'move', move : { type : 'move', from : selection.from, to : hex } })
        setSelection(undefined)
    }

    function onSelectHand(piece : PieceType){
        setSelection(selection?.kind == 'hand' && selection.piece == piece ? undefined : { kind : 'hand', piece })
    }

    function onLeave(){
        leave()
        navigate('/')
    }

    function onResign(){
        if (window.confirm('Are you sure you want to resign?')) send({ type : 'resign' })
    }

    // my pieces at the bottom (or white for spectators), the opponent's at the top
    const bottomColor : Color = myColor ?? 'white'
    const topColor = getOpponent(bottomColor)
    const nameOfColor = (color : Color) => match ? displayName(match.players[color], me.playerId) : ''

    return (
        <div className="room">
            <div className="room-board">
                {match
                    ? (
                        <Board
                            state={match.state}
                            targets={targets}
                            selectable={movable}
                            selected={selection?.kind == 'board' ? hexToKey(selection.from) : undefined}
                            onHexClick={onHexClick}
                        />
                    )
                    : <p className="hint board-placeholder">The match starts when both players are ready.</p>}
            </div>

            <aside className="room-side">
                <RoomHeader roomId={roomId} visibility={room.visibility} spectators={room.spectators} onLeave={onLeave} />

                {conn.status == 'closed' && conn.error && <p className="error">{conn.error}</p>}
                {conn.notice && <p className="error">{conn.notice}</p>}
                {conn.away && (
                    <p className="warning">
                        {displayName(conn.away.playerId, me.playerId)}: connection lost. Time left to reconnect: <Countdown until={conn.away.until} />
                    </p>
                )}

                {match && (
                    <section className="card">
                        <div className="hand-row">
                            <span className={`player-tag tag-${topColor}`}>{COLOR_NAMES[topColor]} · {nameOfColor(topColor)}</span>
                            <Hand pieces={match.state.hands[topColor]} placeable={new Set()} selected={undefined} onSelect={() => {}} />
                        </div>

                        <p className={`turn ${myTurn ? 'is-mine' : ''}`}>
                            {match.result
                                ? resultText(match.result)
                                : myTurn ? 'Your turn' : `Turn: ${displayName(match.currentPlayer, me.playerId)}`}
                        </p>

                        <div className="hand-row">
                            <span className={`player-tag tag-${bottomColor}`}>{COLOR_NAMES[bottomColor]} · {nameOfColor(bottomColor)}</span>
                            <Hand
                                pieces={match.state.hands[bottomColor]}
                                placeable={placeable}
                                selected={selection?.kind == 'hand' ? selection.piece : undefined}
                                onSelect={onSelectHand}
                            />
                        </div>

                        {ongoing && myColor && (
                            <div className="actions">
                                {canOnlyPass && <button type="button" className="primary" onClick={() => send({ type : 'move', move : { type : 'pass' } })}>Pass</button>}
                                <button type="button" className="danger" onClick={onResign}>Resign</button>
                            </div>
                        )}
                    </section>
                )}

                {!ongoing && (
                    <PreMatch
                        players={room.players}
                        myId={me.playerId}
                        isPlayer={isPlayer}
                        rematch={match != undefined}
                        onColor={color => send({ type : 'choose_color', color })}
                        onReady={ready => send({ type : ready ? 'ready' : 'unready' })}
                    />
                )}

                {match && match.history.length > 0 && (
                    <section className="card">
                        <h3>Moves</h3>
                        <ol className="history">
                            {match.history.map((notation, i) => <li key={i}>{notation}</li>)}
                        </ol>
                    </section>
                )}
            </aside>
        </div>
    )
}

function RoomHeader({ roomId, visibility, spectators, onLeave } : { roomId : string, visibility : string, spectators : number, onLeave : () => void }){
    const [copied, setCopied] = useState(false)
    const link = `${window.location.origin}${window.location.pathname}#/room/${roomId}`

    async function copy(){
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            window.prompt('Copy link:', link)
        }
    }

    return (
        <section className="card room-header">
            <div>
                <h2>Room {roomId.slice(0, 8)}</h2>
                <p className="hint">
                    {visibility == 'public' ? 'Public' : 'Private'}
                    {spectators > 0 && ` · ${spectators} ${spectators == 1 ? 'spectator' : 'spectators'}`}
                </p>
            </div>
            <div className="actions">
                <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
                <button type="button" className="ghost" onClick={onLeave}>Leave</button>
            </div>
        </section>
    )
}

type PreMatchProps = {
    players : RoomPlayer[],
    myId : string,
    isPlayer : boolean,
    rematch : boolean,
    onColor : (color : Color | 'random') => void,
    onReady : (ready : boolean) => void
}

const CHOICES : { value : Color | 'random', label : string }[] = [
    { value : 'white', label : 'White' },
    { value : 'black', label : 'Black' },
    { value : 'random', label : 'Random' }
]

// color choice and ready state before a match (and for a rematch)
function PreMatch({ players, myId, isPlayer, rematch, onColor, onReady } : PreMatchProps){
    const mine = players.find(p => p.playerId == myId)

    return (
        <section className="card">
            <h3>{rematch ? 'Rematch' : 'Players'}</h3>
            <ul className="players">
                {players.map(p => (
                    <li key={p.playerId} className={p.ready ? 'is-ready' : ''}>
                        <span>{displayName(p.playerId, myId)}{!p.connected && ' (disconnected)'}</span>
                        <span className="hint">{CHOICES.find(c => c.value == p.colorChoice)?.label}</span>
                        <span className="ready-badge">{p.ready ? 'Ready' : 'Waiting'}</span>
                    </li>
                ))}
                {players.length < 2 && <li className="hint">Waiting for an opponent, send them the link.</li>}
            </ul>

            {isPlayer && mine && (
                <>
                    <div className="segmented" role="radiogroup" aria-label="Color">
                        {CHOICES.map(c => (
                            <button
                                key={c.value}
                                type="button"
                                className={mine.colorChoice == c.value ? 'is-active' : ''}
                                onClick={() => onColor(c.value)}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" className={mine.ready ? '' : 'primary'} onClick={() => onReady(!mine.ready)}>
                        {mine.ready ? 'Not ready' : rematch ? 'Rematch' : 'Ready'}
                    </button>
                </>
            )}
            {!isPlayer && <p className="hint">You are watching as a spectator.</p>}
        </section>
    )
}

function Countdown({ until } : { until : number }){
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [])

    return <span>{Math.max(0, Math.ceil((until - now) / 1000))} s</span>
}
