import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { CollisionResponse } from "./collider.js";
export class GetColliders {
    envRenderer;
    constructor(envRenderer) {
        this.envRenderer = envRenderer;
    }
    getColliders() {
        const colliders = [];
        if (this.envRenderer?.floor) {
            colliders.push({
                type: 'floor',
                colliders: this.envRenderer.floor.getAllColliders().map(data => ({
                    collider: data.collider,
                    position: data.position
                }))
            });
        }
        if (this.envRenderer?.chambers) {
            colliders.push({
                type: 'chamber',
                colliders: this.envRenderer.chambers.getAllColliders().map(data => ({
                    collider: data.collider,
                    position: data.position
                }))
            });
        }
        return colliders;
    }
    getCollidables() {
        const collidables = this.getColliders();
        if (!collidables)
            return [];
        return collidables.flatMap(c => c.colliders.map(data => {
            const position = data.position ? vec3.clone(data.position) : vec3.create();
            return {
                getCollider: () => data.collider,
                getPosition: () => position,
                getCollisionInfo: () => ({
                    type: c.type,
                    position: vec3.clone(position)
                }),
                onCollision: (other) => {
                    other.getCollisionInfo?.();
                },
                getCollisionResponse: () => CollisionResponse.BLOCK
            };
        }));
    }
    getCollidersMap() {
        const collidables = this.getColliders();
        if (!collidables)
            return [];
        return collidables.flatMap(c => c.colliders.map(data => ({
            collider: data.collider,
            position: data.position,
            type: c.type
        })));
    }
}
