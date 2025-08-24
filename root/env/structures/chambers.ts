import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "../env-buffers.js";
import { Patterns } from "../patterns.interface.js";
import { StructureManager } from "./structure-manager.js";
import { Loader } from "../../loader.js";
import { ShaderLoader } from "../../shader-loader.js";
import { BoxCollider, Collider, CollisionInfo, ICollidable } from "../../collision/collider.js";

interface Data extends EnvBufferData {
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
    faceIndex?: number;
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
    private shaderLoader: ShaderLoader;
    private structureManager: StructureManager;

    private blocks: Data[] = [];
    private blockIdCounter: number = 0;
    private chamberTransform: mat4 = mat4.create();
    
    private src: Map<string, Resource> = new Map();
    private id: string = 'default-chamber';
    private _Collider: BoxCollider[] = [];
    private isFill!: number;

    private chamberColorsBuffer!: GPUBuffer;
    private chamberColors!: Float32Array;

    //Props
    private chamberPos = {
        x: 5.0,
        y: 0.0,
        z: 8.0
    }

    private collisionScale = {
        w: 40.0,
        h: 40.0,
        d: 40.0
    }

    constructor(device: GPUDevice, loader: Loader, shaderLoader: ShaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.structureManager = new StructureManager();
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
        rotation?: {
            axis: 'x' | 'y' | 'z';
            angle: number;
        }
    ): Promise<{ 
        block: Data | null, 
        collider: BoxCollider | null
    }> {
        if(!isBlock) return { block: null, collider: null }

        const isChamber = this.isFill || 0.0;
        const size = this.structureManager.getSize();
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

        this.updateMatrix(block, position, size, rotation);
        const worldCenter = vec3.create();
        vec3.transformMat4(worldCenter, vec3.create(), block.modelMatrix);

        const collider = isBlock ? 
        new BoxCollider(
            [
                size.w * this.collisionScale.w,
                size.h * this.collisionScale.h,
                size.d * this.collisionScale.d
            ],
            worldCenter
        ) : null;

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
                isChamber: number
            }[],
            fill: {
                pos: { x: number; y: number; z: number },
                rotation: { axis: 'x' | 'y' | 'z'; angle: number },
                pattern: string[],
                isChamber: number
            }[],
        } = {
            base: [
                {
                    //Front
                    pos: { x: 0.0, y: 0.0, z: 0.0 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.base.front,
                    isChamber: 0.0
                },
                {
                    //Right
                    pos: { x: 0, y: 0.0, z: 0.0 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.right,
                    isChamber: 0.0
                },
                {
                    //Left
                    pos: { x: 0.0, y: 0.0, z: 4.8 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.left,
                    isChamber: 0.0
                },
                {
                    //Back
                    pos: { x: 0.0, y: 0.0, z: -4.8 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.base.back,
                    isChamber: 0.0
                },
                {
                    //Ceiling
                    pos: { x: 0.0, y: -5.6, z: -5.6 },
                    rotation: { axis: 'x', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.ceiling,
                    isChamber: 0.0
                },
                {
                    //Floor
                    pos: { x: 0.0, y: -5.6, z: -0.8 },
                    rotation: { axis: 'x', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.base.floor,
                    isChamber: 0.0
                },
            ],
            fill: [
                {
                    //Front
                    pos: { x: 0.0, y: 0.0, z: 0.0 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.fill.front,
                    isChamber: 1.0
                },
                {
                    //Right
                    pos: { x: 0, y: 0.0, z: 0.0 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.fill.right,
                    isChamber: 2.0
                },
                {
                    //Left
                    pos: { x: 0.0, y: 0.0, z: 4.8 },
                    rotation: { axis: 'y', angle: Math.PI / 2 },
                    pattern: patternData.patterns.chamber.fill.left,
                    isChamber: 3.0
                },
                {
                    //Back
                    pos: { x: 0.0, y: 0.0, z: -4.8 },
                    rotation: { axis: 'y', angle: 0.0 },
                    pattern: patternData.patterns.chamber.fill.back,
                    isChamber: 4.0
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
                    this.create.bind(this),
                    config.rotation
                )
    
                this.blocks.push(...blocks.filter(b => b !== null) as Data[]);
                this._Collider.push(...colliders.filter(c => c !== null) as BoxCollider[]);
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

    private async initColors(): Promise<void> {
        const colors = new Float32Array(20);
        colors.set([0.2, 0.8, 0.2, 1.0], 0);
        colors.set([0.2, 0.8, 0.2, 1.0], 4);
        colors.set([0.2, 0.2, 0.8, 1.0], 8);
        colors.set([0.8, 0.8, 0.2, 1.0], 12);
        colors.set([0.8, 0.2, 0.2, 1.0], 16);

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

    public getChamberColorBuffer(): GPUBuffer {
        return this.chamberColorsBuffer;
    }

    private setUpdatedPosition(position: vec3): void {
        mat4.identity(this.chamberTransform);
        mat4.translate(this.chamberTransform, this.chamberTransform, position);
    }

    public async init(): Promise<void> {
        try {
            await this.initColors();
            await this.loadAssets();
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
}