import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "../env-buffers.js";
import { Patterns } from "../patterns.interface.js";
import { StructureManager } from "./structure-manager.js";
import { Loader } from "../../loader.js";
import { BoxCollider, Collider, CollisionInfo, ICollidable } from "../../collision/collider.js";
import { StencilRenderer } from "./stencil-renderer.js";

export interface Data extends EnvBufferData {
    id?: string,
    modelMatrix: mat4;
    position: vec3;
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    texture: GPUTexture;
    sampler: GPUSampler;
    resourceId?: string;
    isChamber?: number[];
}

interface Resource {
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    texture: GPUTexture;
    sampler: GPUSampler;
    referenceCount: number;
}

export class Chambers implements ICollidable {
    private device: GPUDevice;
    private loader: Loader;
    private structureManager: StructureManager;
    private stencilRenderer: StencilRenderer;

    private blocks: Data[] = [];
    private blockIdCounter: number = 0;
    private chamberTransform: mat4 = mat4.create();
    
    private stencilValues: Map<string, number> = new Map();
    private src: Map<string, Resource> = new Map();
    private id: string = 'default-chamber';
    private _Collider: BoxCollider[] = [];
    private isFill!: number;

    public colorBuffer!: GPUBuffer;
    public hightlitedSideBuffer!: GPUBuffer;
    public propColorBuffer!: GPUBuffer;

    //Props
        private chamberPos = {
            x: 5.0,
            y: 0.0,
            z: 8.0
        }
    
        private baseSize: vec3 = { w: 0.05, h: 0.05, d: 0.05 }
        private fillSize: vec3 = { w: 0.25, h: 0.25, d: 0.05 }
        private collisionScale = { w: 40.0, h: 40.0, d: 40.0 }
        private fillCollisionScale = { w: 0.0, h: 0.0, d: 0.0 }
    //

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.structureManager = new StructureManager();
        this.stencilRenderer = new StencilRenderer(device);
    }

    private async loadAssets(): Promise<void> {
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
        } catch(err) {
            throw err;
        }
    }

    private getResource(id: string): Resource {
        const resource = this.src.get(id);
        if(!resource) throw new Error(`${id} not found`);
        resource.referenceCount++;
        return resource;
    }

    private async create(
        position: vec3,
        isBlock: boolean,
        size: vec3,
        collision: { w: number, h: number, d: number },
        rotation?: {
            axis: 'x' | 'y' | 'z';
            angle: number;
        },
    ): Promise<{ 
        block: Data | null, 
        collider: BoxCollider | null
    }> {
        if(!isBlock) return { block: null, collider: null }

        const isChamber = this.isFill || 0.0;
        const source = this.getResource(this.id);
        if(!source) throw new Error('err');

        const block: Data = {
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
        }

        const stencilValue = this.isFill || 0;
        this.stencilValues.set(block.id!, stencilValue);

        this.updateMatrix(block, position, size, rotation);
        const worldCenter = vec3.create();
        vec3.transformMat4(worldCenter, vec3.create(), block.modelMatrix);

        const collider = isBlock ? 
        new BoxCollider(
            [
                size.w * collision.w,
                size.h * collision.h,
                size.d * collision.d
            ],
            worldCenter
        ) : null;

        this.blocks.sort((a, b) => {
            const aPos = vec3.transformMat4(vec3.create(), vec3.create(), a.modelMatrix);
            const bPos = vec3.transformMat4(vec3.create(), vec3.create(), b.modelMatrix);
            return bPos[1] * aPos[2]
        });

        this.blocks.push(block);
        return { block, collider };
    }

    private updateMatrix(
        block: vec3,
        position: vec3,
        size: vec3,
        rotation: vec3
    ): void {
        mat4.identity(block.modelMatrix);

        if(rotation) {
            switch(rotation.axis) {
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

    public async generate(): Promise<void> {
        this.blocks = [];
        this._Collider = [];
        const patternDataArray = await this.loadPatternData();
        const patternData = patternDataArray[0];

        const configs: {
            base: {
                pos: { x: number; y: number; z: number },
                rotation: { axis: 'x' | 'y' | 'z'; angle: number },
                pattern: string[],
                isChamber: number,
                size: vec3,
                collisionScale: { w: number, h: number, d: number }
            }[],
            fill: {
                pos: { x: number; y: number; z: number },
                rotation: { axis: 'x' | 'y' | 'z'; angle: number },
                pattern: string[],
                isChamber: number,
                size: vec3,
                collisionScale: { w: number, h: number, d: number }
            }[],
        } = {
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

        for(const group of [configs.base, configs.fill]) {
            for(const config of group) {
                this.isFill = config.isChamber;
                const position = vec3.fromValues(config.pos.x, config.pos.y, config.pos.z)
                const { blocks, colliders } = await this.structureManager.createFromPattern(
                    config.pattern,
                    position,
                    (pos: vec3, isBlock: boolean, rotation?: any) =>
                        this.create(pos, isBlock, config.size, config.collisionScale, rotation),
                    config.rotation
                )
    
                this.blocks.push(...blocks.filter(b => b !== null) as Data[]);
                this._Collider.push(...colliders as BoxCollider[]);
            }
        }
    }

    public getPosition(): vec3 {
        return vec3.fromValues(0, 0, 0);
    }

    public getCollider(): Collider {
        return this._Collider.length > 0
        ? this._Collider[0]
        : new BoxCollider([0, 0, 0], [0, 0, 0]);
    }

    public getCollisionInfo(): CollisionInfo {
        return {
            type: 'chamber',
            position: this.getPosition()
        }
    }

    public getAllColliders(): {
        collider: Collider,
        position: vec3,
        type: string
    }[] {
        return this._Collider.map(collider => ({
            collider,
            position: vec3.clone(collider as BoxCollider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }

    private async getColors(): Promise<void> {
        const colors = new Float32Array(5 * 4);
        colors.set([1.0, 0.0, 0.0, 1.0], 0);
        colors.set([1.0, 0.0, 0.0, 1.0], 4); //Red
        colors.set([0.0, 1.0, 0.0, 1.0], 8); //Green
        colors.set([0.0, 0.0, 1.0, 1.0], 12); //Blue
        colors.set([1.0, 1.0, 0.0, 1.0], 16); //Yellow

        this.colorBuffer = this.device.createBuffer({
            size: colors.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.colorBuffer.getMappedRange()).set(colors);
        this.colorBuffer.unmap();

        this.hightlitedSideBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.propColorBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    public getData(): Data[] {
        return this.blocks;
    }

    private async loadPatternData(): Promise<Patterns> {
        try {
            const res = await fetch('./.data/patterns.json');
            if(!res.ok) throw new Error(`err, ${res.status}`);
            return await res.json();
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private setUpdatedPosition(position: vec3): void {
        mat4.identity(this.chamberTransform);
        mat4.translate(this.chamberTransform, this.chamberTransform, position);
    }

    public async init(): Promise<void> {
        try {
            await this.loadAssets();
            await this.getColors();
            this.setUpdatedPosition(
                vec3.fromValues(
                    this.chamberPos.x, 
                    this.chamberPos.y, 
                    this.chamberPos.z
                )
            );
            await this.generate();
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async renderStencil(passEncoder: GPURenderPassEncoder, viewProjectionMatrix: mat4): Promise<void> {
        await this.stencilRenderer.renderMasks(passEncoder, viewProjectionMatrix, this.getData());
    }
}