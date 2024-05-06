import domready from "domready"
import spectral from "spectral.js"
import { canvasRGBA } from "stackblur-canvas"
import "./style.css"
import randomPalette, { randomPaletteWithBlack } from "./randomPalette"
import RTree from "rtree"
import AABB from "./AABB"
import { intersectsNgon, intersectsPoly } from "./intersect"
import { distance, distance2 } from "./util"
import weightedRandom from "./weightedRandom"
import Color from "./Color"

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


/**
 * @type CanvasRenderingContext2D
 */
let tmpCtx;
let tmpCanvas;


function setSpectralJsColors(g, colorA, colorB, count, alpha)
{
    const pal = spectral.palette(colorA, colorB, count, spectral.HEX)
    const step = 1/(count-1)
    for (let i = 0; i < pal.length; i++)
    {
        g.addColorStop(i * step, Color.from(pal[i]).toRGBA(alpha))
    }
}

function getColorPair(palette)
{
    const indexA = 0|Math.random() * palette.length
    let indexB
    do
    {
        indexB = 0 | Math.random() * palette.length

    } while ( indexB === indexA)

    return [
        palette[indexA],
        palette[indexB]
    ]
}

function getColorExcluding(palette, colorA)
{
    let colorB
    do
    {
        colorB = palette[0|Math.random() * palette.length]
    } while ( colorA === colorB )

    return colorB
}


function randomRatio()
{
    return Math.random() < 0.5 ? 0.5 : 0.25
}

// this as vector
// function randomAlignment(base, d0,d1)
// {
//     const c = Math.floor(Math.random() * 3)
//     switch(c)
//     {
//         // begin
//         case 0:
//             return base
//
//         // center
//         case 1:
//             return base + d0/2 - d1/2
//
//         // end
//         case 2:
//             return base + d0 - d1
//     }
// }



function random(min, max, pow = 1)
{
    return Math.floor(Math.pow(Math.random(), pow) * (max + 1 - min) + min)
}


function createNGon(ref, count = random(3, 8), relRadius = 0.2)
{
    const { width, height, palette } = config

    const size = Math.min(width, height)

    const radius = Math.floor((0.8 + Math.random() * 0.2) * size * relRadius)

    const gap = 8// Math.floor(size * 0.004)

    const points = []
    const step = TAU/count
    const alpha = step / 2

    let a
    let cx
    let cy
    let parent
    let parentColor
    if (ref)
    {
        const { points } = ref

        const index = 0|Math.random() * points.length

        const pt0 = points[index]
        const pt1 = index === points.length - 1 ? points[0] : points[index + 1]
        const [ x0, y0 ] = pt0
        const [ x1, y1 ] = pt1

        const len = distance(pt0, pt1)

        const mx = (x0 + x1)/2
        const my = (y0 + y1)/2

        const nx = (x1 - x0)/len
        const ny = (y1 - y0)/len

        const sinB = Math.sin(TAU / 4 - alpha)
        cx = mx + ny * (gap + radius * sinB)
        cy = my - nx * (gap + radius * sinB)

        a = Math.atan2(my - cy, mx - cx) + alpha
        parent = ref.center
        parentColor = ref.color
    }
    else
    {
        cx = width >> 1
        cy = height >> 1
        a = 0
        parentColor = null
        parent = null
    }

    const aabb = new AABB()
    for (let i = 0; i < count; i++)
    {
        const x = cx + Math.cos(a) * radius
        const y = cy + Math.sin(a) * radius
        points.push(
            [
                x,
                y
            ]
        )
        aabb.add(x,y)

        a += step
    }

    const color = palette[0|Math.random() * palette.length]
    return {
        center: [cx,cy],
        radius,
        relRadius,
        points,
        aabb,
        parentColor,
        parent,
        color
    };
}


function paintNgon(ctx, ng, scale = 1, alpha = 1, stroke = false)
{
    let { points, color: fill, center : [cx,cy] } = ng

    if (ng.parentColor && scale === 1)
    {
        const [x0,y0] = ng.parent
        const [x1,y1] = ng.center

        const x2 = x0 + (x1 - x0) * 1.33
        const y2 = y0 + (y1 - y0) * 1.33

        const g = ctx.createLinearGradient(x0,y0,x2,y2)
        setSpectralJsColors(g, ng.parentColor, fill, 30, alpha)
        fill = g
    }
    else
    {
        fill = Color.from(fill).toRGBA(alpha)
    }

    ctx.fillStyle = fill

    ctx.beginPath()
    const [x, y] = points[points.length - 1]

    const x2 = (x - cx) * scale + cx
    const y2 = (y - cy) * scale + cy

    ctx.moveTo(x2,y2)
    for (let i = 0; i < points.length; i++)
    {
        const [x, y] = points[i]

        const x2 = (x - cx) * scale + cx
        const y2 = (y - cy) * scale + cy

        ctx.lineTo(x2,y2)
    }
    ctx.fill()
    stroke && ctx.stroke()
}


const ngonCounts = weightedRandom([
        //1, () => 3,
        1, () => 4,
        4, () => 5,
        6, () => 6,
        1, () => 8,
    ]
)

const big = 0.12
const medium = 0.05
const small = 0.02

const scale = 1.25

const ngonSizes = weightedRandom([
        1, () => big * scale,
        4, () => medium * scale,
        1, () => small * scale,
    ]
)

function getDirectionality(x0,y0,x1,y1,x2,y2)
{
    const a = distance2(x2,y2,x1,y1)
    const b = distance2(x2,y2,x0,y0)
    const c = distance2(x1,y1,x0,y0)

    return (c * c + b * b - a * a ) / (2 * b * c)
}


function createBackgroundGradient()
{
    const { width, height, palette } = config

    const g = ctx.createLinearGradient(0,0,0,height * 8)
    setSpectralJsColors(g, "#000", palette[0|Math.random() * palette.length] , 256, 1)
    return g
}


function strokeNgon(n)
{
    const {points} = n
    ctx.beginPath()
    const [x, y] = points[points.length - 1]
    ctx.moveTo(x, y)
    for (let i = 0; i < points.length; i++)
    {
        const [x, y] = points[i]
        ctx.lineTo(x, y)
    }
    ctx.stroke()
}


function distort()
{
    const { width, height, palette } = config

    const pos = width >> 1 + Math.floor((-0.5 + Math.random()) * width)

    tmpCtx.globalCompositeOperation = "destination-out"

    const level = Math.random()

    for (let i = 0; i < 250; i++)
    {
        const x = Math.floor(Math.random() * width)
        tmpCtx.fillStyle = `rgba(255,255,255,${level}`
        tmpCtx.fillRect(x,0,1,height)
    }
    tmpCtx.globalCompositeOperation = "source-over"
}


function sparkle(ctx,n)
{
    const { width, height, palette } = config
    const { points } = n

    const [cx,cy] = points[0|Math.random() * points.length]

    const count = 12 + Math.random() * 36
    ctx.fillStyle = "#fff"

    const radius = 40 + Math.random() * 110

    for (let i = 0; i < count; i++)
    {
        const r = Math.floor(Math.random() * radius)
        const a = TAU * Math.random()

        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r

        const size = 1 + Math.floor(Math.pow(Math.random(),4) * 12)
        ctx.fillRect(x, y, size, size)
    }
}


domready(
    () => {

        canvas = document.getElementById("screen");
        tmpCanvas = document.createElement("canvas")
        ctx = canvas.getContext("2d");
        tmpCtx = tmpCanvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;
        tmpCanvas.width = width;
        tmpCanvas.height = height;

        const paint = () => {

            tree = new RTree()

            tmpCtx.clearRect(0,0,width,height)

            const palette = randomPalette()
            config.palette = palette

            ctx.fillStyle = createBackgroundGradient()
            ctx.fillRect(0, 0, width, height)

            const ngons = []

            const count = 75

            const root = createNGon(null, ngonCounts(), big)

            ngons.push(root);
            tree.insert(root.aabb, root)

            const check = (n, excl = null) => {
                const results = tree.search(n.aabb)
                for (let i = 0; i < results.length; i++)
                {
                    const ngon = results[i]
                    if (ngon !== excl)
                    {
                        if (intersectsNgon(n, ngon))
                        {
                            return false
                        }
                    }
                }
                return true
            }

            let prev = root
            for (let i = 0; i < count; i++)
            {
                const parent = Math.random() < 0.5 ? prev : ngons[0 | Math.random() * ngons.length]

                const ngon = createNGon(parent, ngonCounts(), ngonSizes())
                if (check(ngon, parent))
                {
                    ngons.push(ngon)
                    tree.insert(ngon.aabb, ngon)
                    prev = ngon
                }
                else
                {
                    i--
                }

            }

            const large = ngons.filter(n => n.relRadius === big)

            const pre = large[0|Math.random() * large.length]
            paintNgon(ctx, pre, 4, 0.05)
            paintNgon(ctx, pre, 3, 0.1)
            paintNgon(ctx, pre, 2, 0.3)

            ctx.strokeStyle = "#000"
            ctx.lineWidth = 1
            let repaint = []

            ngons.forEach(ng => {
                if (ng.relRadius > small)
                {
                    if (Math.random() < 0.5)
                    {
                        paintNgon(tmpCtx, ng, 1, 1, false)
                        paintNgon(ctx, ng, 1, 1, false)

                        if (Math.random() < 0.5)
                        {
                            repaint.push(ng)
                        }
                    }
                    else
                    {
                        paintNgon(ctx, ng, 1, 1, false)
                    }
                }
            })


            ctx.strokeStyle = "#fff"
            ctx.lineWidth = 4
            const sparkles = []
            ngons.filter(n => n.relRadius === big).forEach(n => {

                if (Math.random() < 0.5)
                {
                    if (Math.random() < 0.9)
                    {
                        sparkles.push(n)
                    }
                    return
                }
                else
                {
                    strokeNgon(n)
                }
            })

            canvasRGBA(tmpCtx.canvas, 0,0,width,height, 60)
            distort()
            ctx.drawImage(tmpCanvas,0 ,0)

            repaint.forEach(n => paintNgon(ctx, n,1,1,false) )

            sparkles.forEach(n => sparkle(ctx, n))


        }

        paint()

        canvas.addEventListener("click", paint, true)
    }
);
