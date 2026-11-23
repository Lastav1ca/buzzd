import type { Hex } from "../../src/engine/grid/hex.js"
import type { PieceType } from "../../src/engine/pieces/types.js"

export const HEX_SIZE = 36   // distance from center to corner, in SVG units

// "pointy-top" layout: (q+1, r) is right, (q+1, r-1) is upper right, as in the notation
export function hexToPixel(hex : Hex, size = HEX_SIZE) : { x : number, y : number }{
    return {
        x : size * Math.sqrt(3) * (hex.q + hex.r / 2),
        y : size * 1.5 * hex.r
    }
}

// hexagon corners as a string for <polygon points="...">
export function hexPoints(x : number, y : number, size = HEX_SIZE) : string{
    const points : string[] = []
    for (let i = 0; i < 6; i++){
        const angle = Math.PI / 180 * (60 * i - 30)
        points.push(`${(x + size * Math.cos(angle)).toFixed(2)},${(y + size * Math.sin(angle)).toFixed(2)}`)
    }
    return points.join(' ')
}

export const TYPE_ORDER : PieceType[] = ['queen', 'ant', 'grasshopper', 'beetle', 'spider']

export const TYPE_LETTERS : Record<PieceType, string> = {
    queen : 'Q',
    ant : 'A',
    grasshopper : 'G',
    beetle : 'B',
    spider : 'S'
}

export const TYPE_NAMES : Record<PieceType, string> = {
    queen : 'Queen',
    ant : 'Ant',
    grasshopper : 'Grasshopper',
    beetle : 'Beetle',
    spider : 'Spider'
}
