// returns true if the line from (x0,y0)->(x1,y1) intersects with (x2,y2)->(x3,y3)
import { distance } from "./util"


export function intersects(x0, y0, x1, y1, x2, y2, x3, y3)
{
    const det = (x1 - x0) * (y3 - y2) - (x3 - x2) * (y1 - y0);
    if (det === 0) {
        return false;
    } else {
        const lambda = ((y3 - y2) * (x3 - x0) + (x2 - x3) * (y3 - y0)) / det;
        const gamma = ((y0 - y1) * (x3 - x0) + (x1 - x0) * (y3 - y0)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
}

export function intersectsPoly(poly0, poly1)
{
    for (let i = 0; i < poly0.length; i++)
    {
        const [x0,y0] = poly0[i]
        const [x1,y1] = i === poly0.length - 1 ? poly0[0] : poly0[i + 1]
        for (let j = 0; j < poly1.length; j++)
        {
            const [x2,y2] = poly1[j]
            const [x3,y3] = j === poly1.length - 1 ? poly1[0] : poly1[j + 1]

            if (intersects(x0,y0,x1,y1,x2,y2,x3,y3))
            {
                return true
            }
        }
    }
    return false
}

export function intersectsNgon(n0,n1)
{
    const { center : pt0, radius : r0 } = n0
    const { center : pt1, radius : r1 } = n1

    const d = distance(pt0,pt1)

    if (d < r0 + r1)
    {
        return true
    }

    return intersects(n0.points, n1.points)
}

