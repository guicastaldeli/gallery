import { mat3, mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "../../env-buffers.js";
import { Patterns } from "../../patterns.interface.js";
import { StructureManager } from "../structure-manager.js";
import { Loader } from "../../../loader.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { StencilRenderer } from "./stencil-renderer.js";
import { BoxCollider, Collider, CollisionInfo, ICollidable } from "../../../collision/collider.js";

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
    private canvas: HTMLCanvasElement;
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;
    private structureManager: StructureManager;
    private stencilRenderer: StencilRenderer;

    private blocks: Data[] = [];
    private blockIdCounter: number = 0;
    private chamberTransform: mat4 = mat4.create();
    
    private src: Map<string, Resource> = new Map();
    private id: string = 'default-chamber';
    private _Collider: BoxCollider[] = [];

    //Props
    private chamberPos = {
        x: 5.0,
        y: 0.0,
        z: 5.0
    }

    private collisionScale = {
        w: 40.0,
        h: 40.0,
        d: 40.0
    }

    constructor(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        loader: Loader,
        shaderLoader: ShaderLoader
    ) {
        this.canvas = canvas;
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        
        this.structureManager = new StructureManager();
        this.stencilRenderer = new StencilRenderer(device, canvas, shaderLoader);
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
            resourceId: this.id
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
            pos: { x: number; y: number; z: number },
            rotation: { axis: 'x' | 'y' | 'z'; angle: number },
            pattern: string[]
        }[] = [
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

        for(const config of configs) {
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

    private setUpdatedPosition(position: vec3): void {
        mat4.identity(this.chamberTransform);
        mat4.translate(this.chamberTransform, this.chamberTransform, position);
    }

    //Render
    private async renderStencil(viewProjectionMatrix: mat4, passEncoder: GPURenderPassEncoder): Promise<void> {
        try {
            passEncoder.setPipeline(this.stencilRenderer.stencilMaskPipeline);
    
            for(let i = 0; i < 6; i++) {
                const faceModelMatrix = this.getFaceModelMatrix(i);

                const modelViewProjection = mat4.create();
                mat4.multiply(modelViewProjection, viewProjectionMatrix, faceModelMatrix);

                const faceColor = this.stencilRenderer.getFaceColor(i);

                const buffers = this.stencilRenderer.updateBuffers(
                    modelViewProjection,
                    faceModelMatrix,
                    this.stencilRenderer.stencilMaskValues[i],
                    faceColor
                );
    
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
                //passEncoder.drawIndexed(faceIndexCount, 1, 0, 0, 0);
            }
    
            passEncoder.setPipeline(this.stencilRenderer.stencilGeometryPipeline);
    
            for(const block of this.blocks) {
                const modelViewProjection = mat4.create();
                mat4.multiply(modelViewProjection, viewProjectionMatrix, block.modelMatrix);
                const stencilValue = this.stencilRenderer.getStencilValueGeometry(block);
                const faceColor = this.stencilRenderer.getFaceColor(stencilValue - 1);

                const buffers = this.stencilRenderer.updateBuffers(
                    modelViewProjection,
                    block.modelMatrix,
                    stencilValue,
                    faceColor
                );
    
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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private getFaceModelMatrix(faceIndex: number): mat4 {
        const faceModelMatrix = mat4.create();
        const faceSize = 1.0;

        switch(faceIndex) {
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

    public async init(): Promise<void> {
        try {
            await this.loadAssets();
            this.setUpdatedPosition(
                vec3.fromValues(
                    this.chamberPos.x, 
                    this.chamberPos.y, 
                    this.chamberPos.z
                )
            );
            await this.generate();
            await this.stencilRenderer.init();
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async initStencil(viewProjectionMatrix: mat4, passEncoder: GPURenderPassEncoder): Promise<void> {
        try {
            if(!viewProjectionMatrix || !passEncoder) throw new Error('err');
            await this.renderStencil(viewProjectionMatrix, passEncoder);
        } catch(err) {
            console.log(err);
            throw err;
        }
    }
}