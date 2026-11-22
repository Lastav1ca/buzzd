import type { MatchManager } from "../match/matchManager.js"
import { Room, type Visibility } from "./room.js"

// sve sobe su samo u memoriji; restart servera ih brise
export class RoomManager {
    private rooms : Map<string, Room> = new Map()
    private matches : MatchManager

    constructor(matches : MatchManager){
        this.matches = matches
    }

    create(visibility : Visibility) : Room{
        const room = new Room(crypto.randomUUID(), visibility, this.matches, r => this.rooms.delete(r.id))
        this.rooms.set(room.id, room)
        return room
    }

    get(id : string) : Room | undefined{
        return this.rooms.get(id)
    }

    // javne sobe u koje jos moze da se udje kao igrac
    listPublic() : Room[]{
        return Array.from(this.rooms.values()).filter(r => r.visibility == 'public' && r.hasFreeSeat())
    }

    findByMatch(matchId : string) : Room | undefined{
        return Array.from(this.rooms.values()).find(r => r.getMatchId() == matchId)
    }
}
