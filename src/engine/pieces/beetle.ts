import { getCommonNeighbors, getNeighbors, type Hex } from "../grid/hex.js"
import { getPiecesAt, type GameState } from "../state.js"
import { canSlide } from "./movement.js"

// jedno polje, moze i da se penje na druge figure
export function getBeetleMoves(state : GameState, from : Hex) : Hex[]{
    // buba je vec skinuta sa table, pa je ovo visina steka ispod nje
    const fromHeight = getPiecesAt(state, from).length

    return getNeighbors(from).filter(to => {
        const toHeight = getPiecesAt(state, to).length

        // po zemlji vaze ista pravila kao za klizanje
        if (fromHeight == 0 && toHeight == 0){
            return canSlide(state, from, to)
        }

        // gore: blokirana samo ako su oba zajednicka suseda visa i od polazista i od cilja
        const [a, b] = getCommonNeighbors(from, to)
        if (!a || !b) {throw new Error('Hexes are not neighbors')}
        const gateHeight = Math.min(getPiecesAt(state, a).length, getPiecesAt(state, b).length)

        return gateHeight <= Math.max(fromHeight, toHeight)
    })
}
