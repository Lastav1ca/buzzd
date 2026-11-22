import pg from "pg"
import type { Color } from "../engine/pieces/types.js"
import type { Match } from "../match/match.js"
import { config } from "./config.js"

const pool = new pg.Pool({ connectionString : config.databaseUrl })

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS matches (
        id            UUID PRIMARY KEY,
        white_user_id UUID,
        black_user_id UUID,
        moves         TEXT[] NOT NULL,
        winner        TEXT,
        reason        TEXT NOT NULL,
        started_at    TIMESTAMPTZ NOT NULL,
        ended_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`

export async function initDb(){
    await pool.query(SCHEMA)
}

export async function closeDb(){
    await pool.end()
}

// prekinuti mecevi (aborted) se ne upisuju
export async function saveFinishedMatch(match : Match, userIds : Record<Color, string | null>){
    const result = match.getResult()
    if (!result || result.kind == 'aborted') return

    const winner = result.kind == 'win' ? result.winner : null
    const reason = result.kind == 'win' ? result.reason : 'draw'

    await pool.query(
        `INSERT INTO matches (id, white_user_id, black_user_id, moves, winner, reason, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [match.id, userIds.white, userIds.black, match.getHistory(), winner, reason, match.getStartedAt()]
    )
}
