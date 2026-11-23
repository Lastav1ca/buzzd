import { useEffect, useState } from "react"
import { Lobby } from "./components/Lobby.js"
import { RoomView } from "./components/RoomView.js"
import { parseRoute } from "./router.js"

export function App(){
    const [route, setRoute] = useState(() => parseRoute(window.location.hash))

    useEffect(() => {
        const onChange = () => setRoute(parseRoute(window.location.hash))
        window.addEventListener('hashchange', onChange)
        return () => window.removeEventListener('hashchange', onChange)
    }, [])

    return (
        <div className="app">
            <header className="app-header">
                <a href="#/" className="logo">buzzd</a>
            </header>
            <main className="app-main">
                {route.page == 'room'
                    ? <RoomView key={route.roomId} roomId={route.roomId} />
                    : <Lobby />}
            </main>
        </div>
    )
}
