import { hexToKey, keyToHex, type Hex } from "../../../src/engine/grid/hex.js"
import { HEX_SIZE, hexPoints, hexToPixel } from "../hexLayout.js"
import type { SerializedState } from "../protocol.js"
import { PieceHex } from "./PieceHex.js"

type Props = {
    state : SerializedState,
    targets : Hex[],              // hexes the selected piece can move to
    selectable : Set<string>,     // hexes with pieces the player can move
    selected : string | undefined,
    onHexClick : (hex : Hex) => void
}

const PADDING = HEX_SIZE * 1.5

export function Board({ state, targets, selectable, selected, onHexClick } : Props){
    const stacks = state.board.map(([key, stack]) => ({ key, hex : keyToHex(key), stack }))

    // empty board: show at least the center hex
    const shown = [...stacks.map(s => s.hex), ...targets]
    if (shown.length == 0) shown.push({ q : 0, r : 0 })

    const pixels = shown.map(h => hexToPixel(h))
    const minX = Math.min(...pixels.map(p => p.x)) - PADDING
    const maxX = Math.max(...pixels.map(p => p.x)) + PADDING
    const minY = Math.min(...pixels.map(p => p.y)) - PADDING
    const maxY = Math.max(...pixels.map(p => p.y)) + PADDING

    return (
        <svg className="board" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="Board">
            {stacks.length == 0 && targets.length == 0 && (
                <polygon className="hex-empty" points={hexPoints(0, 0)} />
            )}

            {stacks.map(({ key, hex, stack }) => {
                const top = stack.at(-1)
                if (!top) return null
                const { x, y } = hexToPixel(hex)
                const classes = [
                    selectable.has(key) ? 'is-selectable' : '',
                    selected == key ? 'is-selected' : ''
                ].join(' ')

                return (
                    <g key={key} onClick={() => onHexClick(hex)}>
                        <PieceHex piece={top} x={x} y={y} stackHeight={stack.length} className={classes} />
                    </g>
                )
            })}

            {targets.map(hex => {
                const { x, y } = hexToPixel(hex)
                const key = hexToKey(hex)
                const occupied = stacks.some(s => s.key == key)
                return (
                    <polygon
                        key={`target-${key}`}
                        className={occupied ? 'hex-target hex-target-climb' : 'hex-target'}
                        points={hexPoints(x, y, HEX_SIZE * 0.9)}
                        onClick={() => onHexClick(hex)}
                    />
                )
            })}
        </svg>
    )
}
