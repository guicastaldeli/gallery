import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../../collision/collider.js";
import { StructureManager } from "./structure-manager.js";
export class Chambers {
    loader;
    structureManager;
    blocks = [];
    blockIdCounter = 0;
    _Collider = [];
    src = new Map();
    id = 'default-chamber';
    collisionScale = {
        w: 40.0,
        h: 40.0,
        d: 40.0
    };
    constructor(loader) {
        this.loader = loader;
        this.structureManager = new StructureManager();
    }
    async loadAssets() {
        try {
            const model = await this.loader.parser('./.assets/env/obj/walls.obj');
            const texture = await this.loader.textureLoader('./.assets/env/textures/walls.png');
            const sampler = this.loader.createSampler();
            this.src.set(this.id, {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                texture: texture,
                sampler: sampler,
                referenceCount: 0
            });
        }
        catch (err) {
            throw err;
        }
    }
    getResource(id) {
        const resource = this.src.get(id);
        if (!resource)
            throw new Error(`${id} not found`);
        resource.referenceCount++;
        return resource;
    }
    async create(position, isBlock, rotation) {
        if (!isBlock)
            return { block: null, collider: null };
        const size = this.structureManager.getSize();
        const source = this.getResource(this.id);
        if (!source)
            throw new Error('err');
        const block = {
            id: `block-${this.blockIdCounter++}`,
            modelMatrix: mat4.create(),
            normalMatrix: mat3.create(),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id
        };
        mat4.identity(block.modelMatrix);
        if (rotation) {
            switch (rotation.axis) {
                case 'x':
                    mat4.rotateX(block.modelMatrix, block.modelMatrix, rotation.angle);
                    break;
                case 'y':
                    mat4.rotateY(block.modelMatrix, block.modelMatrix, rotation.angle);
                    break;
                case "z":
                    mat4.rotateZ(block.modelMatrix, block.modelMatrix, rotation.angle);
                    break;
            }
        }
        mat4.translate(block.modelMatrix, block.modelMatrix, position);
        mat4.scale(block.modelMatrix, block.modelMatrix, [size.w, size.h, size.d]);
        const worldCenter = vec3.create();
        vec3.transformMat4(worldCenter, vec3.create(), block.modelMatrix);
        const collider = isBlock ?
            new BoxCollider([
                size.w * this.collisionScale.w,
                size.h * this.collisionScale.h,
                size.d * this.collisionScale.d
            ], worldCenter) : null;
        this.blocks.push(block);
        return { block, collider };
    }
    async generate() {
        this.blocks = [];
        this._Collider = [];
        const patternDataArray = await this.loadPatternData();
        const patternData = patternDataArray[0];
        const patterns = {
            fChamber: {
                pos: {
                    x: -2.0,
                    y: 0.0,
                    z: 19.0
                },
                pattern: patternData.patterns.chamber
            },
            sChamber: {
                pos: {
                    x: -20.0,
                    y: 0.0,
                    z: 15.0
                },
                rotation: {
                    axis: 'y',
                    angle: Math.PI / 2
                },
                pattern: patternData.patterns.chamber
            }
        };
        for (const [_, data] of Object.entries(patterns)) {
            const position = vec3.fromValues(data.pos.x, data.pos.y, data.pos.z);
            const { blocks, colliders } = await this.structureManager.createFromPattern(data.pattern, position, this.create.bind(this), data.rotation);
            this.blocks.push(...blocks.filter(b => b !== null));
            this._Collider.push(...colliders.filter(c => c !== null));
        }
    }
    getPosition() {
        return vec3.fromValues(0, 0, 0);
    }
    getCollider() {
        return this._Collider.length > 0
            ? this._Collider[0]
            : new BoxCollider([0, 0, 0], [0, 0, 0]);
    }
    getCollisionInfo() {
        return {
            type: 'chamber',
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
    getData() {
        return this.blocks;
    }
    async loadPatternData() {
        try {
            const res = await fetch('./.data/patterns.json');
            if (!res.ok)
                throw new Error(`err, ${res.status}`);
            return await res.json();
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async init() {
        await this.loadAssets();
        await this.generate();
    }
}
