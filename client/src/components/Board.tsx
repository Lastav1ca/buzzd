import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react"
import { hexToKey, keyToHex, type Hex } from "../../../src/engine/grid/hex.js"
import { HEX_SIZE, hexPoints, hexToPixel } from "../hexLayout.js"
import type { SerializedState } from "../protocol.js"
import { PieceHex } from "./PieceHex.js"

type Props = {
    state : SerializedState,
    targets : Hex[],              // hexes the selected piece can move to
    selectable : Set<string>,     // hexes with pieces the player can move
    selected : string | undefined,
    onHexClick : (hex : Hex) => void
}

const PADDING = HEX_SIZE * 1.5
// the view always shows at least ~10 hexes across and ~8 rows, so a small hive isn't blown up
const MIN_WIDTH = HEX_SIZE * Math.sqrt(3) * 10
const MIN_HEIGHT = HEX_SIZE * 1.5 * 8

const MIN_ZOOM = 0.3
const MAX_ZOOM = 4
const ZOOM_STEP = 1.25
const DRAG_THRESHOLD = 4   // px the pointer has to move before a press counts as a drag, not a click

// zoom 1 = fit the whole hive; pan is the offset of the view center from the hive center, in SVG units
type View = { zoom : number, panX : number, panY : number }
const DEFAULT_VIEW : View = { zoom : 1, panX : 0, panY : 0 }

type Point = { x : number, y : number }

type Drag = {
    startX : number,
    startY : number,
    panX : number,
    panY : number,
    unitsPerPixel : number,
    moved : boolean
}

const clamp = (value : number, min : number, max : number) => Math.min(max, Math.max(min, value))

export function Board({ state, targets, selectable, selected, onHexClick } : Props){
    const svgRef = useRef<SVGSVGElement>(null)
    const [view, setView] = useState<View>(DEFAULT_VIEW)
    const [dragging, setDragging] = useState(false)
    const dragRef = useRef<Drag | undefined>(undefined)
    const suppressClickRef = useRef(false)

    const stacks = state.board.map(([key, stack]) => ({ key, hex : keyToHex(key), stack }))

    // empty board: show at least the center hex
    const shown = [...stacks.map(s => s.hex), ...targets]
    if (shown.length == 0) shown.push({ q : 0, r : 0 })

    const pixels = shown.map(h => hexToPixel(h))
    const minX = Math.min(...pixels.map(p => p.x)) - PADDING
    const maxX = Math.max(...pixels.map(p => p.x)) + PADDING
    const minY = Math.min(...pixels.map(p => p.y)) - PADDING
    const maxY = Math.max(...pixels.map(p => p.y)) + PADDING

    const center : Point = { x : (minX + maxX) / 2, y : (minY + maxY) / 2 }
    const baseWidth = Math.max(maxX - minX, MIN_WIDTH)
    const baseHeight = Math.max(maxY - minY, MIN_HEIGHT)

    const width = baseWidth / view.zoom
    const height = baseHeight / view.zoom
    const viewX = center.x + view.panX - width / 2
    const viewY = center.y + view.panY - height / 2

    // the wheel listener is registered once, so it reads the current hive center from a ref
    const centerRef = useRef(center)
    centerRef.current = center

    // zoom by factor, keeping the SVG point `anchor` at the same place on screen (default: view center)
    function zoomBy(factor : number, anchor? : Point){
        setView(v => {
            const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM)
            const c = centerRef.current
            const viewCenter = { x : c.x + v.panX, y : c.y + v.panY }
            const p = anchor ?? viewCenter
            const k = v.zoom / zoom
            return {
                zoom,
                panX : p.x + (viewCenter.x - p.x) * k - c.x,
                panY : p.y + (viewCenter.y - p.y) * k - c.y
            }
        })
    }
    const zoomByRef = useRef(zoomBy)
    zoomByRef.current = zoomBy

    // React registers onWheel as passive, so preventDefault (to stop the page from scrolling) needs a native listener
    useEffect(() => {
        const svg = svgRef.current
        if (!svg) return

        function onWheel(event : WheelEvent){
            event.preventDefault()
            const anchor = toSvgPoint(svg!, event.clientX, event.clientY)
            zoomByRef.current(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, anchor)
        }

        svg.addEventListener('wheel', onWheel, { passive : false })
        return () => svg.removeEventListener('wheel', onWheel)
    }, [])

    function onPointerDown(event : PointerEvent<SVGSVGElement>){
        if (event.button != 0) return
        // a drag that ended outside the board never got its click, so the flag may still be set
        suppressClickRef.current = false
        const ctm = svgRef.current?.getScreenCTM()
        if (!ctm) return

        dragRef.current = {
            startX : event.clientX,
            startY : event.clientY,
            panX : view.panX,
            panY : view.panY,
            unitsPerPixel : 1 / ctm.a,
            moved : false
        }
    }

    // move/up listen on window so the drag keeps going when the pointer leaves the board
    useEffect(() => {
        function onMove(event : globalThis.PointerEvent){
            const drag = dragRef.current
            if (!drag) return

            const dx = event.clientX - drag.startX
            const dy = event.clientY - drag.startY
            if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

            if (!drag.moved){
                drag.moved = true
                setDragging(true)
            }
            setView(v => ({ ...v, panX : drag.panX - dx * drag.unitsPerPixel, panY : drag.panY - dy * drag.unitsPerPixel }))
        }

        function onUp(){
            const drag = dragRef.current
            if (!drag) return
            dragRef.current = undefined
            if (drag.moved){
                // the click that follows a drag must not select or move a piece
                suppressClickRef.current = true
                setDragging(false)
            }
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', onUp)
        }
    }, [])

    function onClickCapture(event : MouseEvent<SVGSVGElement>){
        if (!suppressClickRef.current) return
        suppressClickRef.current = false
        event.stopPropagation()
    }

    return (
        <div className="board-wrap">
            <svg
                ref={svgRef}
                className={`board ${dragging ? 'is-dragging' : ''}`}
                viewBox={`${viewX} ${viewY} ${width} ${height}`}
                role="img"
                aria-label="Board"
                onPointerDown={onPointerDown}
                onClickCapture={onClickCapture}
            >
                {stacks.length == 0 && targets.length == 0 && (
                    <polygon className="hex-empty" points={hexPoints(0, 0)} />
                )}

                {stacks.map(({ key, hex, stack }) => {
                    const top = stack.at(-1)
                    if (!top) return null
                    const { x, y } = hexToPixel(hex)
                    const classes = [
                        selectable.has(key) ? 'is-selectable' : '',
                        selected == key ? 'is-selected' : ''
                    ].join(' ')

                    return (
                        <g key={key} onClick={() => onHexClick(hex)}>
                            <PieceHex piece={top} x={x} y={y} stackHeight={stack.length} className={classes} />
                        </g>
                    )
                })}

                {targets.map(hex => {
                    const { x, y } = hexToPixel(hex)
                    const key = hexToKey(hex)
                    const occupied = stacks.some(s => s.key == key)
                    return (
                        <polygon
                            key={`target-${key}`}
                            className={occupied ? 'hex-target hex-target-climb' : 'hex-target'}
                            points={hexPoints(x, y, HEX_SIZE * 0.9)}
                            onClick={() => onHexClick(hex)}
                        />
                    )
                })}
            </svg>

            <div className="board-controls">
                <button type="button" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
                <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={view.zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
                <button type="button" onClick={() => setView(DEFAULT_VIEW)} aria-label="Fit the whole hive">Fit</button>
            </div>
        </div>
    )
}

function toSvgPoint(svg : SVGSVGElement, clientX : number, clientY : number) : Point | undefined{
    const ctm = svg.getScreenCTM()
    if (!ctm) return undefined
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x : p.x, y : p.y }
}
