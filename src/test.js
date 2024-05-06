import domready from "domready"
import spectral from "spectral.js"
import "./style.css"
import { randomPaletteWithBlack } from "./randomPalette"
import RTree from "rtree"
import { intersectsPoly } from "./intersect"

const PHI = (1 + Math.sqrt(5)) / 2;
const PHINV = 1/PHI
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0,
    gap: 0,
    palette: null
};


/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;
let tree





function createOctagon(cx, cy, a = 0)
{
    const pts = []
    const step = TAU/8
    for (let i = 0; i < 8; i++)
    {
        pts.push([
            cx + Math.cos(a) * 200,
            cy + Math.sin(a) * 200
        ])
        a += step
    }

    return pts
}


function drawPolygon(pts)
{
    ctx.beginPath()

    const [x,y] = pts[pts.length - 1]
    ctx.moveTo(x,y)
    for (let i = 0; i < pts.length; i++)
    {
        const [x,y] = pts[i]
        ctx.lineTo(x,y)
    }
    ctx.stroke()
}

let mx, my

function onMouseMove(ev)
{
    mx = ev.clientX;
    my = ev.clientY;
}


domready(
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        const cx = width >> 1
        const cy = height >> 1

        const oct0 = createOctagon(cx,cy, TAU/16)

        mx = cx
        my = cy
        const paint = () => {

            const palette = randomPaletteWithBlack()
            config.palette = palette

            const animate = () => {
                ctx.fillStyle = palette[0]
                ctx.fillRect(0, 0, width, height)

                ctx.strokeStyle = "#fff"
                drawPolygon(oct0)

                const oct1 = createOctagon(mx,my)
                const i = intersectsPoly(oct0, oct1);
                
                ctx.strokeStyle = i ? "#0c0" : "#f00"
                drawPolygon(oct1)

                requestAnimationFrame(animate)
            }
            requestAnimationFrame(animate)


        }

        paint()

        canvas.addEventListener("click", paint, true)
        canvas.addEventListener("mousemove", onMouseMove, true)
    }
);
