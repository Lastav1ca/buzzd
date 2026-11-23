import { Match, type MatchEndHandler } from "./match.js"

// holds all active matches; doesn't know about the database, only forwards onMatchEnd
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

    // finished matches stay until they are removed here
    remove(id : string) : boolean{
        return this.matches.delete(id)
    }

    list() : Match[]{
        return Array.from(this.matches.values())
    }
}
