import { getCommonNeighbors, getNeighbors, type Hex } from "../grid/hex.js"
import { isHexOccupied, type GameState } from "../state.js"

// Klizanje sa from na susedno to. Od dva zajednicka suseda tacno jedan mora biti zauzet:
// oba zauzeta = figura ne moze da se provuce (freedom to move),
// nijedan zauzet = figura bi izgubila kontakt sa kosnicom.
export function canSlide(state : GameState, from : Hex, to : Hex) : boolean{
    const [a, b] = getCommonNeighbors(from, to)
    if (!a || !b) {throw new Error('Hexes are not neighbors')}

    return isHexOccupied(state, a) != isHexOccupied(state, b)
}

// sva prazna susedna polja na koja figura moze da klizne u jednom koraku
export function getSlides(state : GameState, from : Hex) : Hex[]{
    return getNeighbors(from).filter(to => !isHexOccupied(state, to) && canSlide(state, from, to))
}
