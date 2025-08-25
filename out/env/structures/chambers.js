import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { StructureManager } from "./structure-manager.js";
import { BoxCollider } from "../../collision/collider.js";
export class Chambers {
    device;
    loader;
    shaderLoader;
    structureManager;
    blocks = [];
    blockIdCounter = 0;
    chamberTransform = mat4.create();
    src = new Map();
    id = 'default-chamber';
    _Collider = [];
    _fillCollider = [];
    isFill;
    chamberColorsBuffer;
    chamberColors;
    hightlightedSideBuffer;
    hightlightedSide = -1;
    propColorBuffer;
    propColor = [0, 0, 0, 1];
    baseSize = { w: 0.05, h: 0.05, d: 0.05 };
    fillSize = { w: 0.25, h: 0.25, d: 0.05 };
    //Props
    chamberPos = {
        x: 5.0,
        y: 0.0,
        z: 8.0
    };
    collisionScale = { w: 40.0, h: 40.0, d: 40.0 };
    fillCollisionScale = { w: 5.5, h: 10.0, d: 1.0 };
    sideToIndex = {
        'front': 1,
        'right': 2,
        'left': 3,
        'back': 4
    };
    sideColors = {
        'front': [0.8, 0.2, 0.2, 1.0], //Red
        'right': [0.8, 0.8, 0.2, 1.0], //Yellow
        'left': [0.2, 0.2, 0.8, 1.0], //Blue
        'back': [0.2, 0.8, 0.2, 1.0] //Green
    };
    //
    constructor(device, loader, shaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
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
    async create(position, isBlock, size, collision, rotation) {
        if (!isBlock)
            return { block: null, collider: null };
        const isChamber = this.isFill || 0.0;
        const source = this.getResource(this.id);
        if (!source)
            throw new Error('err');
        const block = {
            id: `block-${this.blockIdCounter++}`,
            modelMatrix: mat4.create(),
            position: vec3.clone(position),
            normalMatrix: mat3.create(),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id,
            isChamber: [isChamber, isChamber, isChamber]
        };
        this.updateMatrix(block, position, size, rotation);
        const worldCenter = vec3.create();
        vec3.transformMat4(worldCenter, vec3.create(), block.modelMatrix);
        const collider = isBlock ?
            new BoxCollider([
                size.w * collision.w,
                size.h * collision.h,
                size.d * collision.d
            ], worldCenter) : null;
        this.blocks.sort((a, b) => {
            const aPos = vec3.transformMat4(vec3.create(), vec3.create(), a.modelMatrix);
            const bPos = vec3.transformMat4(vec3.create(), vec3.create(), b.modelMatrix);
            return bPos[1] * aPos[2];
        });
        this.blocks.push(block);
        return { block, collider };
    }
    updateMatrix(block, position, size, rotation) {
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
        mat4.multiply(block.modelMatrix, this.chamberTransform, block.modelMatrix);
        mat4.scale(block.modelMatrix, block.modelMatrix, [size.w, size.h, size.d]);
    }
    async generate() {
        this.blocks = [];
        this._Collider = [];
        const patternDataArray = await this.loadPatternData();
        const patternData = patternDataArray[0];
        const configs = {
            base: [
                {
                    //Front
                    pos: { x: 0.0, y: 0.0, z: 0.0 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.base.front,
                    isChamber: 0.0,
                    size: this.baseSize,
                    collisionScale: { w: this.collisionScale.w, h: this.collisionScale.h, d: this.collisionScale.d }
                },
                {
                    //Right
                    pos: { x: 0, y: 0.0, z: 0.0 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.right,
                    isChamber: 0.0,
                    size: this.baseSize,
                    collisionScale: { w: this.collisionScale.w, h: this.collisionScale.h, d: this.collisionScale.d }
                },
                {
                    //Left
                    pos: { x: 0.0, y: 0.0, z: 4.8 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.left,
                    isChamber: 0.0,
                    size: this.baseSize,
                    collisionScale: { w: this.collisionScale.w, h: this.collisionScale.h, d: this.collisionScale.d }
                },
                {
                    //Back
                    pos: { x: 0.0, y: 0.0, z: -4.8 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.base.back,
                    isChamber: 0.0,
                    size: this.baseSize,
                    collisionScale: { w: this.collisionScale.w, h: this.collisionScale.h, d: this.collisionScale.d }
                },
                {
                    //Ceiling
                    pos: { x: 0.0, y: -5.6, z: -5.6 },
                    rotation: { axis: 'x', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.ceiling,
                    isChamber: 0.0,
                    size: this.baseSize,
                    collisionScale: { w: this.collisionScale.w, h: this.collisionScale.h, d: this.collisionScale.d }
                },
                {
                    //Floor
                    pos: { x: 0.0, y: -5.6, z: -0.8 },
                    rotation: { axis: 'x', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.floor,
                    isChamber: 0.0,
                    size: this.baseSize,
                    collisionScale: { w: this.collisionScale.w, h: this.collisionScale.h, d: this.collisionScale.d }
                },
            ],
            fill: [
                {
                    //Front
                    pos: { x: 0.0, y: 1.6, z: 0.0 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.fill,
                    isChamber: 1.0,
                    size: this.fillSize,
                    collisionScale: { w: this.fillCollisionScale.w, h: this.fillCollisionScale.h, d: this.fillCollisionScale.d }
                },
                {
                    //Right
                    pos: { x: 0.0, y: 1.6, z: 0.0 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.fill,
                    isChamber: 2.0,
                    size: this.fillSize,
                    collisionScale: { w: this.fillCollisionScale.w, h: this.fillCollisionScale.h, d: this.fillCollisionScale.d }
                },
                {
                    //Left
                    pos: { x: 0.0, y: 1.6, z: 4.8 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.fill,
                    isChamber: 3.0,
                    size: this.fillSize,
                    collisionScale: { w: this.fillCollisionScale.w, h: this.fillCollisionScale.h, d: this.fillCollisionScale.d }
                },
                {
                    //Back
                    pos: { x: 0.0, y: 1.6, z: -4.8 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.fill,
                    isChamber: 4.0,
                    size: this.fillSize,
                    collisionScale: { w: this.fillCollisionScale.w, h: this.fillCollisionScale.h, d: this.fillCollisionScale.d }
                }
            ]
        };
        for (const group of [configs.base, configs.fill]) {
            for (const config of group) {
                this.isFill = config.isChamber;
                const position = vec3.fromValues(config.pos.x, config.pos.y, config.pos.z);
                const { blocks, colliders } = await this.structureManager.createFromPattern(config.pattern, position, (pos, isBlock, rotation) => this.create(pos, isBlock, config.size, config.collisionScale, rotation), config.rotation);
                this.blocks.push(...blocks.filter(b => b !== null));
                this._Collider.push(...colliders.filter(c => c !== null));
                if (config.isChamber > 0) {
                    const fillColliders = colliders.filter(c => c !== null);
                    const sideName = this.getSideName(config.isChamber);
                    fillColliders.forEach(c => {
                        this._fillCollider.push({ collider: c, side: sideName });
                    });
                }
            }
        }
    }
    getSideName(isChamber) {
        switch (isChamber) {
            case 1.0: return 'front';
            case 2.0: return 'right';
            case 3.0: return 'left';
            case 4.0: return 'back';
            default: return 'unknown';
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
        return this._Collider.map(collider => ({
            collider,
            position: vec3.clone(collider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }
    getFillCollider() {
        return this._fillCollider;
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
    async initColors() {
        const colors = new Float32Array(20);
        colors.set([0.2, 0.8, 0.2, 1.0], 0); //Green
        colors.set([0.8, 0.2, 0.2, 1.0], 4); //Red
        colors.set([0.2, 0.2, 0.8, 1.0], 8); //Blue
        colors.set([0.8, 0.8, 0.2, 1.0], 12); //Yellow
        colors.set([0.2, 0.8, 0.2, 1.0], 16); //Green
        this.chamberColors = new Float32Array(colors);
        this.chamberColorsBuffer = this.device.createBuffer({
            size: this.chamberColors.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        const mappedRange = new Float32Array(this.chamberColorsBuffer.getMappedRange());
        mappedRange.set(this.chamberColors);
        this.chamberColorsBuffer.unmap();
    }
    getChamberColorBuffer() {
        return this.chamberColorsBuffer;
    }
    setUpdatedPosition(position) {
        mat4.identity(this.chamberTransform);
        mat4.translate(this.chamberTransform, this.chamberTransform, position);
    }
    async detectChamber(camera) {
        const ray = camera.getRay();
        let closestHit = {
            distance: Infinity,
            side: 'none',
            collider: null
        };
        for (const data of this.getFillCollider()) {
            const collider = data.collider;
            const result = ray.intersectBox(collider);
            if (result.hit &&
                result.distance !== undefined &&
                result.distance < closestHit.distance) {
                const side = ray.getHitSide(result.faceNormal || vec3.create());
                closestHit = {
                    distance: result.distance,
                    side: side,
                    collider: collider
                };
            }
        }
        return closestHit.side;
    }
    createHightlighBuffer() {
        this.hightlightedSideBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Int32Array(this.hightlightedSideBuffer.getMappedRange()).set([-1]);
        this.hightlightedSideBuffer.unmap();
        this.propColorBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.propColorBuffer.getMappedRange()).set([0, 0, 0, 1]);
        this.propColorBuffer.unmap();
    }
    getHightlightedSideBuffer() {
        return this.hightlightedSideBuffer;
    }
    getPropColorBuffer() {
        return this.propColorBuffer;
    }
    async init() {
        try {
            await this.initColors();
            await this.loadAssets();
            this.createHightlighBuffer();
            this.setUpdatedPosition(vec3.fromValues(this.chamberPos.x, this.chamberPos.y, this.chamberPos.z));
            await this.generate();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async updateRaycaster(camera) {
        const side = await this.detectChamber(camera);
        let sideIndex = -1;
        let colorToPropagate = [0, 0, 0, 1];
        if (side in this.sideToIndex) {
            sideIndex = this.sideToIndex[side];
            colorToPropagate = this.sideColors[side];
            console.log(`Looking at ${side}`);
        }
        else {
            sideIndex = -1;
            colorToPropagate = [0, 0, 0, 1];
        }
        if (this.hightlightedSide !== sideIndex) {
            this.hightlightedSide = sideIndex;
            this.device.queue.writeBuffer(this.hightlightedSideBuffer, 0, new Int32Array([this.hightlightedSide]));
        }
        if (!this.vec4Equals(this.propColor, colorToPropagate)) {
            this.propColor = colorToPropagate;
            this.device.queue.writeBuffer(this.propColorBuffer, 0, new Float32Array(this.propColor));
        }
    }
    vec4Equals(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }
}
