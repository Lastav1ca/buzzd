import type { Piece, PieceType } from "../../../src/engine/pieces/types.js"
import { HEX_SIZE, hexPoints, TYPE_ORDER } from "../hexLayout.js"
import antUrl from "../../resources/pieces/ant.png"
import beetleUrl from "../../resources/pieces/beetle.png"
import grasshopperUrl from "../../resources/pieces/grasshopper.png"
import queenUrl from "../../resources/pieces/bee.png"
import spiderUrl from "../../resources/pieces/spider.png"

const ICONS : Record<PieceType, string> = {
    queen : queenUrl,
    ant : antUrl,
    grasshopper : grasshopperUrl,
    beetle : beetleUrl,
    spider : spiderUrl
}

const maskId = (type : PieceType) => `piece-icon-${type}`

// The icons are black PNGs on a transparent background. They are used as alpha masks, so the shape comes from
// the PNG and the color from CSS (--type-*). Rendered once in App, every piece references them by id.
export function PieceIconDefs(){
    return (
        <svg className="piece-defs" width="0" height="0" aria-hidden="true">
            <defs>
                {TYPE_ORDER.map(type => (
                    <mask key={type} id={maskId(type)} maskContentUnits="objectBoundingBox" style={{ maskType : 'alpha' }}>
                        <image href={ICONS[type]} x="0" y="0" width="1" height="1" />
                    </mask>
                ))}
            </defs>
        </svg>
    )
}

type Props = {
    piece : Piece,
    x : number,
    y : number,
    size? : number,
    stackHeight? : number,
    className? : string
}

// icon box side relative to the hex size; per type, because the PNGs have different amounts of empty space
const ICON_SCALE : Record<PieceType, number> = {
    queen : 1.5,
    ant : 1.5,
    grasshopper : 1.15,
    beetle : 1.25,
    spider : 1.35
}

// one piece: a hexagon in the player's color with the icon of the piece type
export function PieceHex({ piece, x, y, size = HEX_SIZE, stackHeight = 1, className = '' } : Props){
    const icon = size * ICON_SCALE[piece.type]

    return (
        <g className={`piece piece-${piece.color} type-${piece.type} ${className}`}>
            <polygon className="piece-body" points={hexPoints(x, y, size * 0.92)} />
            <rect
                className="piece-icon"
                x={x - icon / 2}
                y={y - icon / 2}
                width={icon}
                height={icon}
                mask={`url(#${maskId(piece.type)})`}
            />
            {stackHeight > 1 && (
                <text className="piece-stack" x={x + size * 0.5} y={y - size * 0.45} fontSize={size * 0.38}>
                    {stackHeight}
                </text>
            )}
        </g>
    )
}
