import { mat3, mat4, vec3, quat } from "../../../node_modules/gl-matrix/esm/index.js";
import 'reflect-metadata';

import { Tick } from "../../tick.js";
import { Loader } from "../../loader.js";
import { ShaderLoader } from "../../shader-loader.js";
import { Floor } from "../structures/floor/floor.js";
import { LightningManager } from "../../lightning-manager.js";
import { Controller } from "../../controller/controller.js";
import { EnvBufferData } from "../env-buffers.js";

export function Injectable() {
    return (target: any) => {
        Reflect.defineMetadata('injectable', true, target);
    }
}

export type List = ''

type Types = ''

interface Dependencies {
    tick: Tick;
    device: GPUDevice;
    passEncoder: GPURenderPassEncoder | null;
    loader: Loader;
    shaderLoader: ShaderLoader;
    floor: Floor;
    lightningManager: LightningManager;
    canvas: HTMLCanvasElement;
    controller: Controller | null;
    format: GPUTextureFormat;
    viewProjectionMatrix: mat4;
}

const dependenciesMap = new Map<Function, keyof Dependencies>([
    [Tick, 'tick'],
    [GPUDevice, 'device'],
    [GPURenderPassEncoder, 'passEncoder'],
    [Loader, 'loader'],
    [ShaderLoader, 'shaderLoader'],
    [Floor, 'floor'],
    [LightningManager, 'lightningManager'],
    [HTMLCanvasElement, 'canvas'],
    [Controller, 'controller'],
    [Object, 'format'],
    [mat4, 'viewProjectionMatrix'],
]);

@Injectable()
export class ObjectManager {
    private readyPromise: Promise<void>;
    private id: number = 1;
    public deps: Dependencies;
    private objects: Map<number, List> = new Map();
    private objectsType: Map<Types, List> = new Map();
    private typeRegistry: Map<Types, {
        constructor: new (...args: any[]) => List,
        init?: (instance: List, deps: Dependencies) => Promise<void>
    }> = new Map();

    constructor(deps: Dependencies) {
        this.deps = deps;
        this.readyPromise = this.registeredTypes();
    }

    private registerType<T extends List>(
        type: Types,
        constructor: new (...args: any[]) => T,
        init?: (instance: T, deps: Dependencies) => Promise<void>
    ): void {
        this.typeRegistry.set(type, {
            constructor,
            init: init ? async (instance, deps) => {
                await init(instance as T, deps);
            } : undefined
        });
    }

    private async registeredTypes(): Promise<void> {
        /*
        this.registerType('randomBlocks', RandomBlocks, async (instance, deps) => {
            await(instance as RandomBlocks).init(deps.canvas, deps.playerController!, deps.format);
        });
        */
    }

    private resolveDependencies(constructor: new (...args: any[]) => any): any[] {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', constructor) || [];

        return paramTypes.map(type => {
            const key = dependenciesMap.get(type);
            if(!key) throw new Error(`No dep registered for type ${type.name}`);

            const dependency = this.deps[key];
            if(!dependency) throw new Error(`Missing dependency ${String(key)}`);

            return dependency;
        });
    }

    public async createObject(type: Types): Promise<number> {
        try {
            const typeInfo = this.typeRegistry.get(type);
            if(!typeInfo) throw new Error(`Object type ${type} not registered`);
    
            const constructorArgs = this.resolveDependencies(typeInfo.constructor);
            const instance = new typeInfo.constructor(...constructorArgs);
            if(typeInfo.init) await typeInfo.init(instance, this.deps);
    
            const id = this.generateId(type);
            this.objects.set(id, instance);
            return id;
        } catch(err) {
            console.error(`Failed to create object ${type}:`, err);
            return 0;
        }
    }

    private generateId(type: Types): number {
        const idNumber = this.id++;
        return idNumber;
    }

    public getObjectInstance<T extends List>(id: number): T {
        return this.objects.get(id) as T;
    }

    public async getObject<T extends List>(type: Types): Promise<T> {
        if(!this.typeRegistry.has(type)) throw new Error(`Type "${type}" is not registered.`);

        for(const [id, instance] of this.objects) {
            const typeInfo = this.typeRegistry.get(type);
            if(typeInfo && instance instanceof typeInfo.constructor) {
                return instance as T;
            }
        }

        const id = await this.createObject(type);
        const instance = this.objects.get(id);
        if(!instance) throw new Error(`Failed to create object of type ${type}`);
        return instance as T;
    }

    public async setObjectBuffer(type: Types): Promise<EnvBufferData[] | undefined> {
        const obj = await this.getObject(type);
        if(obj && 'getBuffers' in obj) {
            const buffers = await obj.getBuffers();
            return Array.isArray(buffers) ? buffers : buffers ? [buffers] : undefined;
        }
        return undefined;
    }

    public getAllOfType<T extends List>(type: Types): T[] {
        const typeInfo = this.typeRegistry.get(type);
        if(!typeInfo) throw new Error(`Type "${type}" is not registered.`);
        return Array.from(this.objects.values()).filter(
            obj => obj instanceof typeInfo.constructor
        ) as T[];
    }

    public renderObject(
        id: number,
        device: GPUDevice,
        passEncoder: GPURenderPassEncoder,
        viewProjectionMatrix: mat4,
        deltaTime: number
    ): void {
        const instance = this.objects.get(id);
        if(!instance) return;

        if('draw' in instance && typeof instance.draw === 'function') {
            instance.draw(device, passEncoder, viewProjectionMatrix);
        } else if('update' in instance && typeof instance.update === 'function') {
            instance.update(deltaTime);
        }
    }

    public removeObject(id: number): boolean {
        return this.objects.delete(id);
    }

    public getAllObjects(): List[] {
        return Array.from(this.objects.values());
    }

    public async ready(): Promise<void> {
        await this.readyPromise;
    }
}