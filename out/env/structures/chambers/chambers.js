import { mat3, mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { StructureManager } from "../structure-manager.js";
import { StencilRenderer } from "./stencil-renderer.js";
import { BoxCollider } from "../../../collision/collider.js";
export class Chambers {
    canvas;
    device;
    loader;
    shaderLoader;
    structureManager;
    stencilRenderer;
    blocks = [];
    blockIdCounter = 0;
    chamberTransform = mat4.create();
    src = new Map();
    id = 'default-chamber';
    _Collider = [];
    //Props
    chamberPos = {
        x: 5.0,
        y: 0.0,
        z: 8.0
    };
    collisionScale = {
        w: 40.0,
        h: 40.0,
        d: 40.0
    };
    constructor(canvas, device, loader, shaderLoader) {
        this.canvas = canvas;
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.structureManager = new StructureManager();
        this.stencilRenderer = new StencilRenderer(device, canvas, shaderLoader);
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
            position: vec3.clone(position),
            normalMatrix: mat3.create(),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id
        };
        this.updateMatrix(block, position, size, rotation);
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
        const configs = [
            {
                //Front
                pos: { x: 0.0, y: 0.0, z: 0.0 },
                rotation: { axis: 'y', angle: 0.0 },
                pattern: patternData.patterns.chamber.front
            },
            {
                //Right
                pos: { x: 0, y: 0.0, z: 0.0 },
                rotation: { axis: 'y', angle: Math.PI / 2 },
                pattern: patternData.patterns.chamber.right
            },
            {
                //Left
                pos: { x: 0.0, y: 0.0, z: 4.8 },
                rotation: { axis: 'y', angle: Math.PI / 2 },
                pattern: patternData.patterns.chamber.left
            },
            {
                //Back
                pos: { x: 0.0, y: 0.0, z: -4.8 },
                rotation: { axis: 'y', angle: 0.0 },
                pattern: patternData.patterns.chamber.back
            },
            {
                //Ceiling
                pos: { x: 0.0, y: -5.6, z: -5.6 },
                rotation: { axis: 'x', angle: Math.PI / 2 },
                pattern: patternData.patterns.chamber.ceiling
            },
            {
                //Floor
                pos: { x: 0.0, y: -5.6, z: -0.8 },
                rotation: { axis: 'x', angle: Math.PI / 2 },
                pattern: patternData.patterns.chamber.floor
            },
        ];
        for (const config of configs) {
            const position = vec3.fromValues(config.pos.x, config.pos.y, config.pos.z);
            const { blocks, colliders } = await this.structureManager.createFromPattern(config.pattern, position, this.create.bind(this), config.rotation);
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
        return this._Collider.map(collider => ({
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
    setUpdatedPosition(position) {
        mat4.identity(this.chamberTransform);
        mat4.translate(this.chamberTransform, this.chamberTransform, position);
    }
    //Render
    async renderStencil(viewProjectionMatrix, passEncoder) {
        try {
            passEncoder.setPipeline(this.stencilRenderer.stencilMaskPipeline);
            for (let i = 0; i < 6; i++) {
                const faceModelMatrix = this.getFaceModelMatrix(i);
                const modelViewProjection = mat4.create();
                mat4.multiply(modelViewProjection, viewProjectionMatrix, faceModelMatrix);
                const faceColor = this.stencilRenderer.getFaceColor(i);
                const buffers = this.stencilRenderer.createObjectBuffers();
                this.stencilRenderer.updateBuffers(buffers, modelViewProjection, faceModelMatrix, i + 1, faceColor);
                const bindGroup = this.device.createBindGroup({
                    layout: this.stencilRenderer.stencilMaskPipeline.getBindGroupLayout(0),
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: buffers.mvp }
                        },
                        {
                            binding: 1,
                            resource: { buffer: buffers.modelMatrix }
                        },
                        {
                            binding: 2,
                            resource: { buffer: buffers.stencilValue }
                        },
                        {
                            binding: 3,
                            resource: { buffer: buffers.faceColor }
                        }
                    ]
                });
                passEncoder.setBindGroup(0, bindGroup);
            }
            passEncoder.setPipeline(this.stencilRenderer.stencilGeometryPipeline);
            for (const block of this.blocks) {
                const modelViewProjection = mat4.create();
                mat4.multiply(modelViewProjection, viewProjectionMatrix, block.modelMatrix);
                const stencilValue = this.stencilRenderer.getStencilValueGeometry(block);
                const faceColor = this.stencilRenderer.getFaceColor(stencilValue - 1);
                const buffers = this.stencilRenderer.createObjectBuffers();
                this.stencilRenderer.updateBuffers(buffers, modelViewProjection, block.modelMatrix, stencilValue, faceColor);
                const bindGroup = this.device.createBindGroup({
                    layout: this.stencilRenderer.stencilMaskPipeline.getBindGroupLayout(0),
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: buffers.mvp }
                        },
                        {
                            binding: 1,
                            resource: { buffer: buffers.modelMatrix }
                        },
                        {
                            binding: 2,
                            resource: { buffer: buffers.stencilValue }
                        },
                        {
                            binding: 3,
                            resource: { buffer: buffers.faceColor }
                        },
                    ]
                });
                passEncoder.setBindGroup(0, bindGroup);
                passEncoder.setVertexBuffer(0, block.vertex);
                passEncoder.setIndexBuffer(block.index, 'uint16');
                passEncoder.drawIndexed(block.indexCount);
            }
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    getFaceModelMatrix(faceIndex) {
        const faceModelMatrix = mat4.create();
        const faceSize = 1.0;
        switch (faceIndex) {
            case 0: //Front
                mat4.translate(faceModelMatrix, faceModelMatrix, [0, 0, 0.5 * faceSize]);
                break;
            case 1: //Back
                mat4.translate(faceModelMatrix, faceModelMatrix, [0, 0, -0.5 * faceSize]);
                mat4.rotateY(faceModelMatrix, faceModelMatrix, Math.PI);
                break;
            case 2: //Right
                mat4.translate(faceModelMatrix, faceModelMatrix, [0.5 * faceSize, 0, 0]);
                mat4.rotateY(faceModelMatrix, faceModelMatrix, Math.PI / 2);
                break;
            case 3: //Left
                mat4.translate(faceModelMatrix, faceModelMatrix, [-0.5 * faceSize, 0, 0]);
                mat4.rotateY(faceModelMatrix, faceModelMatrix, -Math.PI / 2);
                break;
            case 4: //Top
                mat4.translate(faceModelMatrix, faceModelMatrix, [0, 0.5 * faceSize, 0]);
                mat4.rotateX(faceModelMatrix, faceModelMatrix, -Math.PI / 2);
                break;
            case 5: //Bottom
                mat4.translate(faceModelMatrix, faceModelMatrix, [0, -0.5 * faceSize, 0]);
                mat4.rotateX(faceModelMatrix, faceModelMatrix, Math.PI / 2);
                break;
            default:
                console.warn(`Unknown face index err: ${faceIndex}`);
        }
        return faceModelMatrix;
    }
    async init() {
        try {
            await this.loadAssets();
            this.setUpdatedPosition(vec3.fromValues(this.chamberPos.x, this.chamberPos.y, this.chamberPos.z));
            await this.generate();
            await this.stencilRenderer.init();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async initStencil(viewProjectionMatrix, passEncoder) {
        try {
            if (!viewProjectionMatrix || !passEncoder)
                throw new Error('err');
            await this.renderStencil(viewProjectionMatrix, passEncoder);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
