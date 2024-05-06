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


function setSpectralJsColors(g, colorA, colorB, count)
{
    const pal = spectral.palette(colorA, colorB, count, spectral.HEX)
    const step = 1/(count-1)
    for (let i = 0; i < pal.length; i++)
    {
        g.addColorStop(i * step, pal[i])
    }
}

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
        fill: null,
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
    let { points, fill, center : [cx,cy] } = ng

    ctx.fillStyle = fill
    ctx.globalAlpha = alpha
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
    ctx.globalAlpha = 1
}


function chooseNgnonCounts(counts)
{
    let out

    do
    {
        out = []

        for (let i = 0; i < counts.length; i += 2)
        {
            if (Math.random() < 0.5)
            {
                const count = counts[i]
                const fn = counts[i + 1]
                out.push(count,fn)
            }
        }

        // we need at least one point count
    } while (out.length === 0)

    console.log("COUNTS", out.filter(fn => typeof fn === "function").map(fn => fn()))

    return out
}


const ngonCounts = weightedRandom(
    chooseNgnonCounts(
        [
            1, () => 3,
            1, () => 4,
            4, () => 5,
            6, () => 6,
            1, () => 8,
        ]
    )
)

const big = 0.12
const medium = 0.05
const small = 0.02

const scale = 1.25

const Execution = {
    PRE: "PRE",
    PER_NGON: "PER_NGON",
    PRE_BLOOM: "PRE_BLOOM",
    POST: "POST",
}


const decorations = [
    {
        // blow-up in background
        execution: Execution.PRE,
        fn: ngons => {

            const large = ngons.filter(n => n.relRadius === big)

            const pre = large[0|Math.random() * large.length]
            paintNgon(ctx, pre, 4, 0.05)
            paintNgon(ctx, pre, 3, 0.1)
            paintNgon(ctx, pre, 2, 0.3)
        }
    },
    {
        // stroke or sparkles
        execution: Execution.POST,
        fn: ngons => {

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

            sparkles.forEach(n => sparkle(ctx, n))
        }
    },
]

const ngonSizes = weightedRandom([
        1, scale => big * scale,
        4, scale => medium * scale,
        1, scale => small * scale,
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
    setSpectralJsColors(g, "#000", palette[0|Math.random() * palette.length] , 256)
    return g
}


function strokeNgon(n, offset = 0)
{

    let { points, center : [cx,cy] } = n

    ctx.beginPath()
    const [x, y] = points[points.length - 1]
    const d = distance2(cx,cy,x,y)
    const f = (d + offset)/d
    const x2 = cx + (x - cx) * f
    const y2 = cy + (y - cy) * f
    ctx.moveTo(x2|0, y2|0)
    for (let i = 0; i < points.length; i++)
    {
        const [x, y] = points[i]

        const d = distance2(cx,cy,x,y)
        const f = (d + offset)/d
        const x2 = cx + (x - cx) * f
        const y2 = cy + (y - cy) * f
        
        ctx.lineTo(x2|0, y2|0)
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

function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}



function chooseDecorations()
{
    const out = []

    const decos = decorations.slice()
    shuffle(decos)
    const num = Math.floor(Math.random() * 3)
    const active = decos.slice(0, num)

    console.log("DECOS", active)

    return active
}


function createBackgrounds(ngons)
{
    ngons.forEach(
        ng => {

            const { color, parentColor } = ng

            if (parentColor)
            {
                const [x0,y0] = ng.parent
                const [x1,y1] = ng.center

                const x2 = x0 + (x1 - x0) * 1.33
                const y2 = y0 + (y1 - y0) * 1.33

                const g = ctx.createLinearGradient(x0,y0,x2,y2)
                setSpectralJsColors(g, ng.parentColor, color, 30)
                ng.fill = g
            }
            else
            {
                ng.fill = color
            }
        }
    )
}

let ngonAlpha = 1


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

            const decos = chooseDecorations()
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

                let scale = 0.5 + Math.random() * 1.5

                const ngon = createNGon(parent, ngonCounts(), ngonSizes(scale))
                if (check(ngon, parent))
                {
                    ngons.push(ngon)
                    tree.insert(ngon.aabb, ngon)
                    prev = ngon
                }
                else
                {
                    // keep number of ngons stable
                    i--
                }
            }

            //console.log("NGONS", ngons)

            createBackgrounds(ngons)

            decos.forEach(d => {
                if (d.execution === Execution.PRE)
                {
                    d.fn(ngons)
                }
            })

            ctx.strokeStyle = "#000"
            ctx.lineWidth = 1
            let repaint = []

            const ngonDecos = decos.filter(d => d.execution === Execution.PER_NGON)

            ngons.forEach((ng,idx) => {
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
                        paintNgon(ctx, ng, 1, ngonAlpha, false)
                    }

                    ngonDecos.forEach(d => {
                        d.fn(ng,idx)
                    })
            })

            decos.forEach(d => {
                if (d.execution === Execution.PRE_BLOOM)
                {
                    d.fn(ngons)
                }
            })

            canvasRGBA(tmpCtx.canvas, 0,0,width,height, 60)
            distort()
            ctx.drawImage(tmpCanvas,0 ,0)


            repaint.forEach(n => paintNgon(ctx, n,1,1,false) )

            decos.forEach(d => {
                if (d.execution === Execution.POST)
                {
                    d.fn(ngons)
                }
            })

        }

        paint()

        canvas.addEventListener("click", paint, true)
    }
);
