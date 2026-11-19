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
    // koliko igrac ima da se poveze posle join-a, odnosno da se vrati posle diskonekcije
    reconnectTimeoutMs : Number(process.env.RECONNECT_TIMEOUT_MS ?? 30_000)
}
