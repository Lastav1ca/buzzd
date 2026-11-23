import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const SERVER = "http://localhost:3000"

export default defineConfig({
    plugins : [react()],
    server : {
        // the client uses the engine from ../src/engine
        fs : { allow : [".."] },
        // requests go through Vite to the server, so there are no CORS issues
        proxy : {
            "/rooms" : SERVER,
            "/healthz" : SERVER,
            "/ws" : { target : SERVER, ws : true }
        }
    }
})
