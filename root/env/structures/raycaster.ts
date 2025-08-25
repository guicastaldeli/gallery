import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../../collision/collider.js";

export class Raycaster {
    private origin: vec3;
    private direction: vec3;

    constructor(origin: vec3, direction: vec3) {
        this.origin = vec3.clone(origin);
        this.direction = vec3.normalize(vec3.create(), direction);
    }

    public intersectBox(box: BoxCollider): {
        hit: boolean;
        distance?: number;
        faceNormal?: vec3;
        point?: vec3
    } {
        return box.rayIntersect(this.origin, this.direction);
    }

    public getHitSide(faceNormal: vec3): string {
        const epsilon = 0.01;
        if(Math.abs(faceNormal[2] - 1) < epsilon) return 'front';
        //if(Math.abs(faceNormal[0] + 1) < epsilon) return 'left';
        //if(Math.abs(faceNormal[0] - 1) < epsilon) return 'right';
        //if(Math.abs(faceNormal[2] + 1) < epsilon) return 'back';
        return 'unknown';
    }
}