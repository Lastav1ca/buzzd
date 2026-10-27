type PieceType = "queen" | "grasshopper" | "beetle" | "spider" | "ant"

export type Color = "white" | "black"

export type Piece = {
    type: PieceType,
    color: Color
};