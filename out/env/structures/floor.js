import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider, CollisionResponse } from "../../collision/collider.js";
export class Floor {
    loader;
    blocks;
    count = 20;
    _Collider = [];
    pos = {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        gap: () => 1.0
    };
    size = {
        w: 0.05,
        h: 0.05,
        d: 0.05
    };
    constructor(loader) {
        this.loader = loader;
        this.blocks = [];
    }
    async loadAssets() {
        try {
            const model = await this.loader.parser('./.assets/env/obj/terrain.obj');
            const texture = await this.loader.textureLoader('./.assets/env/textures/terrain.png');
            const sampler = this.loader.createSampler();
            const data = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                normalMatrix: mat3.create(),
                texture: texture,
                sampler: sampler,
                isChamber: [0.0, 0.0, 0.0]
            };
            return data;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    bufferData(data) {
        return {
            vertex: data.vertex,
            color: data.color,
            index: data.index,
            indexCount: data.indexCount,
            modelMatrix: mat4.clone(data.modelMatrix),
            normalMatrix: mat3.clone(data.normalMatrix),
            texture: data.texture,
            sampler: data.sampler,
            isChamber: [...data.isChamber]
        };
    }
    async create() {
        const baseData = await this.loadAssets();
        for (let x = 0; x < this.count; x++) {
            for (let z = 0; z < this.count; z++) {
                const data = this.bufferData(baseData);
                const position = vec3.fromValues((this.pos.x + x) * this.pos.gap(), this.pos.y, (this.pos.z + z) * this.pos.gap());
                mat4.identity(data.modelMatrix);
                mat4.translate(data.modelMatrix, data.modelMatrix, position);
                mat4.scale(data.modelMatrix, data.modelMatrix, [this.size.w, this.size.h, this.size.d]);
                mat4.copy(data.modelMatrix, data.modelMatrix);
                const collider = new BoxCollider([this.pos.gap(), this.pos.gap(), this.pos.gap()], vec3.fromValues(position[0], position[1], position[2]));
                this.blocks.push(data);
                this._Collider.push(collider);
            }
        }
    }
    getData() {
        return this.blocks;
    }
    getPosition() {
        return vec3.fromValues(0, 0, 0);
    }
    getCollider() {
        return new BoxCollider([this.count * this.pos.gap(), 0.1, this.count * this.pos.gap()], [0, this.pos.y, 0]);
    }
    getCollisionResponse(other) {
        return CollisionResponse.BLOCK;
    }
    getCollisionInfo() {
        return {
            type: 'floor',
            position: this.getPosition()
        };
    }
    getAllColliders() {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone(collider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }
    getLevelY(x, z) {
        return this.pos.y + 0.3;
    }
    async init() {
        await this.create();
    }
}
