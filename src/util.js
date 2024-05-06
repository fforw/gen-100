export function clamp(v)
{
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function distance(pt0, pt1)
{
    const [x0,y0] = pt0
    const [x1,y1] = pt1

    const dx = x1 - x0
    const dy = y1 - y0

    return Math.sqrt(dx * dx + dy * dy)
}

export function distance2(x0,y0,x1,y1)
{
    const dx = x1 - x0
    const dy = y1 - y0

    return Math.sqrt(dx * dx + dy * dy)
}
