# buzzd

Online Hive.

## Pokretanje

```
docker compose up -d          # baza
cp .env.example .env          # samo prvi put
npm install && npm --prefix client install
npm run dev                   # server na :3000
npm run client                # frontend na :5173
```

Frontend otvori na http://localhost:5173. Vite prosleđuje `/rooms` i `/ws` serveru na portu 3000.

## Credits

Bee logo: <a href="https://www.flaticon.com/free-icons/bee" title="bee icons">Bee icons created by Smashingstocks - Flaticon</a>
