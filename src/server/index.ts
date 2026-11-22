import { createServer } from "node:http"
import { MatchManager } from "../match/matchManager.js"
import { config } from "./config.js"
import { initDb, saveFinishedMatch } from "./db.js"
import { createHttpApp } from "./http.js"
import { RoomManager } from "./roomManager.js"
import { attachWebSocket } from "./ws.js"

await initDb()

const matches = new MatchManager(match => {
    const userIds = rooms.findByMatch(match.id)?.getMatchUserIds() ?? { white : null, black : null }
    saveFinishedMatch(match, userIds).catch(err => console.error('Failed to save match', match.id, err))
    matches.remove(match.id)
})
const rooms = new RoomManager(matches)

const server = createServer(createHttpApp(rooms))
attachWebSocket(server, rooms)

server.listen(config.port, () => {
    console.log(`buzzd server na http://localhost:${config.port}`)
})
