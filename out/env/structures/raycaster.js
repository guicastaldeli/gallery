import { vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
export class Raycaster {
    origin;
    direction;
    constructor(origin, direction) {
        this.origin = vec3.clone(origin);
        this.direction = vec3.normalize(vec3.create(), direction);
    }
    intersectBox(box) {
        return box.rayIntersect(this.origin, this.direction);
    }
    getHitSide(faceNormal) {
        const epsilon = 0.0001;
        if (Math.abs(faceNormal[2] - 1) < epsilon)
            return 'front';
        if (Math.abs(faceNormal[0] + 1) < epsilon)
            return 'left';
        if (Math.abs(faceNormal[0] - 1) < epsilon)
            return 'right';
        if (Math.abs(faceNormal[2] + 1) < epsilon)
            return 'back';
        return 'unknown';
    }
}
