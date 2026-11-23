import type { Piece } from "../../../src/engine/pieces/types.js"
import { HEX_SIZE, hexPoints, TYPE_LETTERS } from "../hexLayout.js"

type Props = {
    piece : Piece,
    x : number,
    y : number,
    size? : number,
    stackHeight? : number,
    className? : string
}

// one piece: a hexagon in the player's color with the piece type letter
export function PieceHex({ piece, x, y, size = HEX_SIZE, stackHeight = 1, className = '' } : Props){
    return (
        <g className={`piece piece-${piece.color} type-${piece.type} ${className}`}>
            <polygon className="piece-body" points={hexPoints(x, y, size * 0.92)} />
            <text className="piece-letter" x={x} y={y} fontSize={size * 0.8}>
                {TYPE_LETTERS[piece.type]}
            </text>
            {stackHeight > 1 && (
                <text className="piece-stack" x={x + size * 0.5} y={y - size * 0.45} fontSize={size * 0.38}>
                    {stackHeight}
                </text>
            )}
        </g>
    )
}
