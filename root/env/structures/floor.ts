import { mat3, mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "../env-buffers.js";
import { Loader } from "../../loader.js";
import { BoxCollider, Collider, CollisionInfo, CollisionResponse, ICollidable } from "../../collision/collider.js";

export class Floor implements ICollidable {
    private loader: Loader;
    private blocks: EnvBufferData[];
    private count: number = 20;
    private _Collider: BoxCollider[] = [];

    private pos = {
        x: 0.0,
        y: 0.0,
        z: 0.0,
        gap: () => 1.0
    }

    private size = {
        w: 0.05,
        h: 0.05,
        d: 0.05
    }

    constructor(loader: Loader) {
        this.loader = loader;
        this.blocks = [];
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const model = await this.loader.parser('./.assets/env/obj/terrain.obj');
            const texture = await this.loader.textureLoader('./.assets/env/textures/terrain.png');
            const sampler = this.loader.createSampler();

            const data: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                normalMatrix: mat3.create(),
                texture: texture,
                sampler: sampler,
                isChamber: [0.0, 0.0, 0.0]
            }

            return data;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private bufferData(data: EnvBufferData): EnvBufferData {
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

    private async create(): Promise<void> {
        const baseData = await this.loadAssets();
        
        for(let x = 0; x < this.count; x++) {
            for(let z = 0; z < this.count; z++) {
                const data = this.bufferData(baseData);

                const position = vec3.fromValues(
                    (this.pos.x + x) * this.pos.gap(),
                    this.pos.y,
                    (this.pos.z + z) * this.pos.gap()
                );

                mat4.identity(data.modelMatrix);
                mat4.translate(
                    data.modelMatrix, 
                    data.modelMatrix,
                    position
                );
                mat4.scale(
                    data.modelMatrix,
                    data.modelMatrix,
                    [this.size.w, this.size.h, this.size.d]
                );
                mat4.copy(data.modelMatrix, data.modelMatrix);

                const collider = new BoxCollider(
                    [this.pos.gap(), this.pos.gap(), this.pos.gap()],
                    vec3.fromValues(position[0], position[1], position[2])
                );

                this.blocks.push(data);
                this._Collider.push(collider);
            }
        }
    }

    public getData(): EnvBufferData[] {
        return this.blocks;
    }

    public getPosition(): vec3 {
        return vec3.fromValues(0, 0, 0);
    }

    public getCollider(): Collider {
        return new BoxCollider(
            [this.count * this.pos.gap(), 0.1, this.count * this.pos.gap()],
            [0, this.pos.y, 0]
        );
    }

    public getCollisionResponse(other: ICollidable): CollisionResponse {
        return CollisionResponse.BLOCK;
    }

    public getCollisionInfo(): CollisionInfo {
        return {
            type: 'floor',
            position: this.getPosition()
        }
    }

    public getAllColliders(): { 
        collider: Collider, 
        position: vec3,
        type: string
    }[] {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone(collider as BoxCollider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }

    public getLevelY(x: number, z: number): number {
        return this.pos.y + 0.3;
    }

    public async init(): Promise<void> {
        await this.create();
    }
}