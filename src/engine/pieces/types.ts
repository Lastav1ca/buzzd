export type PieceType = "queen" | "grasshopper" | "beetle" | "spider" | "ant"

export type Color = "white" | "black"

export type Piece = {
    type: PieceType,
    color: Color,
    id: number   // ordinal of the piece within its type (wA1, wA2...), for notation
};

// base set: 11 pieces per player
export const PIECE_COUNTS : Record<PieceType, number> = {
    queen : 1,
    spider : 2,
    beetle : 2,
    grasshopper : 3,
    ant : 3
}

export function getOpponent(color : Color) : Color{
    return color == 'white' ? 'black' : 'white'
}
