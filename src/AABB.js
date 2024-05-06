export default class AABB {

    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    add(x, y)
    {
        this.minX = Math.min(this.minX, x);
        this.minY = Math.min(this.minY, y);
        this.maxX = Math.max(this.maxX, x);
        this.maxY = Math.max(this.maxY, y);
    }

    // aliases for RTree
    get x()
    {
        return this.minX
    }
    get y()
    {
        return this.minY
    }
    get w()
    {
        return Math.ceil(this.maxX - this.minX);
    }
    get h()
    {
        return Math.ceil(this.maxY - this.minY);
    }

    get width()
    {
        return this.w
    }


    get height()
    {
        return this.h
    }

    get center()
    {
        return [(this.minX + this.maxX) >> 1, (this.minY + this.maxY) >> 1 ]
    }

    grow(n)
    {
        this.minX -= n;
        this.minY -= n;
        this.maxY += n;
        this.maxY += n;
    }

    shrink(dir, amount)
    {
        switch(dir)
        {
            case 0:
                this.minX += amount
                this.minY += amount
                break;
            case 1:
                this.maxX -= amount
                this.minY += amount
                break;
            case 2:
                this.maxX -= amount
                this.maxY -= amount
                break;
            case 3:
                this.minX += amount
                this.maxY -= amount
                break;
            default:
                throw new Error("Invalid direction: " + dir)
        }
    }

    copy()
    {
        const clone = new AABB();
        clone.minX = this.minX
        clone.minY = this.minY
        clone.maxX = this.maxX
        clone.maxY = this.maxY

        return clone
    }
}
