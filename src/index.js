import domready from "domready"
import spectral from "spectral.js"
import "./style.css"
import { randomPaletteWithBlack } from "./randomPalette"
import RTree from "rtree"

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


function setPalette(g, colorA, colorB, count)
{
    const pal = spectral.palette(colorA, colorB, count, spectral.HEX)
    const step = 1/(count-1)
    for (let i = 0; i < pal.length; i++)
    {
        g.addColorStop(i * step, pal[i])
    }
}



function createGradient(x0,y0,x1,y1,colorA,colorB)
{

    const g = ctx.createLinearGradient(x0,y0,x1,y1)
    setPalette(g,colorA, colorB, 128)
    return g;
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

function goldenRandom()
{
    const min = 0.2

    return min + (1 - min) * Math.random()
}


function insert(boxes, x, y, w, h, colorA, colorB, horizontal = false)
{
    const { gap } = config

    const box = {
        x,y,w,h,
        colorA,
        colorB,
        horizontal
    }

    const results = tree.search({
        x: x - gap,
        y: y - gap,
        w: w + 2 * gap,
        h: h + 2 * gap,
    })
    if (results.length === 0)
    {
        boxes.push(box)
        tree.insert(box,box)
        return box;
    }
    return null
}


function randomRatio()
{
    return Math.random() < 0.5 ? 0.5 : 0.25
}


function randomAlignment(base, d0,d1)
{
    const c = Math.floor(Math.random() * 3)
    switch(c)
    {
        // begin
        case 0:
            return base

        // center
        case 1:
            return base + d0/2 - d1/2

        // end
        case 2:
            return base + d0 - d1
    }
}


function getBoxColor(box, first, horizontal)
{
    const { colorA, colorB, horizontal : h } = box

    return first ? colorA : colorB
}


const starts = [
    [0.5,0.5],
    [1/3,1/3],
    [2/3,1/3],
    [1/3,2/3],
    [2/3,2/3],
]

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

        const paint = () => {

            tree = new RTree()


            const palette = randomPaletteWithBlack()
            config.palette = palette

            ctx.fillStyle = palette[0]
            ctx.fillRect(0, 0, width, height)


            const boxes = []

            const size = Math.min(width, height)
            const max = Math.floor(size * 0.6)

            const w = goldenRandom() * max * 0.4
            const h = goldenRandom() * max * 0.4

            const start = starts[0|Math.random() * starts.length]

            const x = start[0] * width - w/2
            const y = start[1] * height - h/2

            const [ colorA, colorB ] = getColorPair(palette)

            insert(boxes,x,y,w,h, colorA, colorB, Math.random() < 0.5)

            const gap = Math.ceil(size * 0.006)
            const limit = 10 + Math.random() * 100

            config.gap = gap

            const count = Math.floor(200 + Math.random() * 200)
            const pow = 2 + Math.random() * 3

            for (let i = 0; i < count; i++)
            {
                const box = boxes[0 | Math.random() * boxes.length]
                let {x,y,w,h} = box

                const dir = Math.floor(Math.random() * 4)

                const s = Math.floor(limit + (Math.pow(Math.random(),pow) * (max * 0.4  - limit)))
                let w2 = goldenRandom() * s
                let h2 = goldenRandom() * s


                let horizontal
                let colorA
                let colorB
                let x2, y2
                switch(dir)
                {
                    case 0:
                        x2 = x + w + gap
                        y2 = randomAlignment(y,h,h2)

                        horizontal = true
                        colorA = getBoxColor(box, false, horizontal)
                        colorB = getColorExcluding(palette, colorA)

                        break

                    case 1:
                        x2 = randomAlignment(x,w,w2)
                        y2 = y + h + gap


                        horizontal = false
                        colorA = getBoxColor(box, false, horizontal)
                        colorB = getColorExcluding(palette, colorA)
                        break

                   case 2:
                        x2 = x - gap - w2
                        y2 = randomAlignment(y,h,h2)

                        horizontal = true
                        colorB = getBoxColor(box, false, horizontal)
                        colorA = getColorExcluding(palette, colorB)
                        break

                    case 3:
                        x2 = randomAlignment(x,w,w2)
                        y2 = y - gap - h2

                        horizontal = false
                        colorB = getBoxColor(box, false, horizontal)
                        colorA = getColorExcluding(palette, colorB)
                        break
                }

                if (!insert(boxes, x2, y2, w2, h2, colorA, colorB, horizontal))
                {
                    i--
                }
            }

            ctx.fillStyle = palette[0|Math.random() * palette.length]

            for (let i = 0; i < boxes.length; i++)
            {
                const {x, y, w, h, colorA, colorB, horizontal} = boxes[i]

                if (horizontal)
                {
                    ctx.fillStyle = createGradient(x, y, x + w, y, colorA, colorB)
                }
                else
                {
                    ctx.fillStyle = createGradient(x, y, x, y + h, colorA, colorB)
                }
                ctx.fillRect(x,y,w,h)
            }
        }

        paint()

        canvas.addEventListener("click", paint, true)
    }
);
