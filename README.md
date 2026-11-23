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

Bee logo/game piece: <a href="https://www.flaticon.com/free-icons/bee" title="bee icons">Bee icons created by Smashingstocks - Flaticon</a>\
Beetle game piece: <a href="https://www.flaticon.com/free-icons/beetle" title="beetle icons">Beetle icons created by Park Jisun - Flaticon</a>\
Grasshopper game piece: <a href="https://www.flaticon.com/free-icons/grasshopper" title="grasshopper icons">Grasshopper icons created by Magnific - Flaticon</a>\
Spider game piece: <a href="https://www.flaticon.com/free-icons/spider" title="spider icons">Spider icons created by Magnific - Flaticon</a>\
Ant game piece: <a href="https://www.flaticon.com/free-icons/ant" title="ant icons">Ant icons created by Royyan Wijaya - Flaticon</a>\

