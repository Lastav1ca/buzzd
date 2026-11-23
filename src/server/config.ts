function required(name : string) : string{
    const value = process.env[name]
    if (!value) {throw new Error(`Missing env variable ${name}`)}
    return value
}

export const config = {
    port : Number(process.env.PORT ?? 3000),
    databaseUrl : required('DATABASE_URL'),
    jwtSecret : required('JWT_SECRET'),
    roomTokenTtlSeconds : 12 * 60 * 60,
    // how long a player has to connect after join, or to come back after a disconnect
    reconnectTimeoutMs : Number(process.env.RECONNECT_TIMEOUT_MS ?? 30_000)
}
