import type { MatchManager } from "../match/matchManager.js"
import { Room, type Visibility } from "./room.js"

// all rooms live only in memory; a server restart clears them
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

    // public rooms that can still be joined as a player
    listPublic() : Room[]{
        return Array.from(this.rooms.values()).filter(r => r.visibility == 'public' && r.hasFreeSeat())
    }

    findByMatch(matchId : string) : Room | undefined{
        return Array.from(this.rooms.values()).find(r => r.getMatchId() == matchId)
    }
}
