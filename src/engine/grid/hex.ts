export type Hex = {
    q : number,
    r : number
}

// redom ukrug, pa su DIRECTIONS[i] i DIRECTIONS[i+1] susedni pravci
export const DIRECTIONS : Hex[] = [
    { q : 1, r : 0 },
    { q : 1, r : -1 },
    { q : 0, r : -1 },
    { q : -1, r : 0 },
    { q : -1, r : 1 },
    { q : 0, r : 1 }
]

export function addHex(a : Hex, b : Hex) : Hex{
    return { q : a.q + b.q, r : a.r + b.r }
}

export function hexEquals(a : Hex, b : Hex) : boolean{
    return a.q == b.q && a.r == b.r
}

export function getNeighbors(hex : Hex) : Hex[]{
    return DIRECTIONS.map(d => addHex(hex, d))
}

// dva polja koja su susedi i od a i od b (a i b moraju biti susedi)
export function getCommonNeighbors(a : Hex, b : Hex) : Hex[]{
    const bKeys = new Set(getNeighbors(b).map(hexToKey))
    return getNeighbors(a).filter(n => bKeys.has(hexToKey(n)))
}

export function hexToKey(hex : Hex) : string{
    return `${hex.q},${hex.r}` //q,r
}

export function keyToHex(key : string) : Hex{
    const split = key.split(",")

    if (split[0] == undefined || split[1] == undefined) {throw new Error('Invalid key')}

    const q = Number(split[0])
    const r = Number(split[1])
    if (Number.isNaN(q) || Number.isNaN(r)) {throw new Error('Invalid key')}

    return {q, r}
}
