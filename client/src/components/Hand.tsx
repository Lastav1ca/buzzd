import type { Piece, PieceType } from "../../../src/engine/pieces/types.js"
import { TYPE_NAMES, TYPE_ORDER } from "../hexLayout.js"
import { PieceHex } from "./PieceHex.js"

type Props = {
    pieces : Piece[],
    placeable : Set<PieceType>,          // types the player may place right now
    selected : PieceType | undefined,
    onSelect : (type : PieceType) => void
}

const SIZE = 20

// pieces not yet placed, grouped by type
export function Hand({ pieces, placeable, selected, onSelect } : Props){
    const first = pieces[0]
    if (!first) return <p className="hand-empty">All pieces are already in play.</p>

    return (
        <ul className="hand">
            {TYPE_ORDER.map(type => {
                const count = pieces.filter(p => p.type == type).length
                if (count == 0) return null

                const enabled = placeable.has(type)
                return (
                    <li key={type}>
                        <button
                            type="button"
                            className={`hand-piece ${selected == type ? 'is-selected' : ''}`}
                            disabled={!enabled}
                            onClick={() => onSelect(type)}
                            title={TYPE_NAMES[type]}
                        >
                            <svg viewBox={`${-SIZE} ${-SIZE} ${SIZE * 2} ${SIZE * 2}`} width={SIZE * 2} height={SIZE * 2}>
                                <PieceHex piece={{ type, color : first.color, id : 0 }} x={0} y={0} size={SIZE} />
                            </svg>
                            <span className="hand-count">×{count}</span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
