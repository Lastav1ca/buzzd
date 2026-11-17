import { Match, type MatchEndHandler } from "./match.js"

// drzi sve aktivne meceve; ne zna za bazu, samo prosledjuje onMatchEnd
export class MatchManager {
    private matches : Map<string, Match> = new Map()
    private onMatchEnd : MatchEndHandler

    constructor(onMatchEnd : MatchEndHandler){
        this.onMatchEnd = onMatchEnd
    }

    create(whiteId : string, blackId : string) : Match{
        const match = new Match(crypto.randomUUID(), whiteId, blackId, this.onMatchEnd)
        this.matches.set(match.id, match)
        return match
    }

    get(id : string) : Match | undefined{
        return this.matches.get(id)
    }

    // zavrseni mecevi ostaju dok se ne obrisu ovde
    remove(id : string) : boolean{
        return this.matches.delete(id)
    }

    list() : Match[]{
        return Array.from(this.matches.values())
    }
}
