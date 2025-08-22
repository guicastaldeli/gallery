var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mat4 } from "../../../node_modules/gl-matrix/esm/index.js";
import 'reflect-metadata';
import { Tick } from "../../tick.js";
import { Loader } from "../../loader.js";
import { ShaderLoader } from "../../shader-loader.js";
import { Floor } from "../floor.js";
import { LightningManager } from "../../lightning-manager.js";
import { Controller } from "../../controller/controller.js";
export function Injectable() {
    return (target) => {
        Reflect.defineMetadata('injectable', true, target);
    };
}
const dependenciesMap = new Map([
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
let ObjectManager = class ObjectManager {
    readyPromise;
    id = 1;
    deps;
    objects = new Map();
    objectsType = new Map();
    typeRegistry = new Map();
    constructor(deps) {
        this.deps = deps;
        this.readyPromise = this.registeredTypes();
    }
    registerType(type, constructor, init) {
        this.typeRegistry.set(type, {
            constructor,
            init: init ? async (instance, deps) => {
                await init(instance, deps);
            } : undefined
        });
    }
    async registeredTypes() {
        /*
        this.registerType('randomBlocks', RandomBlocks, async (instance, deps) => {
            await(instance as RandomBlocks).init(deps.canvas, deps.playerController!, deps.format);
        });
        */
    }
    resolveDependencies(constructor) {
        const paramTypes = Reflect.getMetadata('design:paramtypes', constructor) || [];
        return paramTypes.map(type => {
            const key = dependenciesMap.get(type);
            if (!key)
                throw new Error(`No dep registered for type ${type.name}`);
            const dependency = this.deps[key];
            if (!dependency)
                throw new Error(`Missing dependency ${String(key)}`);
            return dependency;
        });
    }
    async createObject(type) {
        try {
            const typeInfo = this.typeRegistry.get(type);
            if (!typeInfo)
                throw new Error(`Object type ${type} not registered`);
            const constructorArgs = this.resolveDependencies(typeInfo.constructor);
            const instance = new typeInfo.constructor(...constructorArgs);
            if (typeInfo.init)
                await typeInfo.init(instance, this.deps);
            const id = this.generateId(type);
            this.objects.set(id, instance);
            return id;
        }
        catch (err) {
            console.error(`Failed to create object ${type}:`, err);
            return 0;
        }
    }
    generateId(type) {
        const idNumber = this.id++;
        return idNumber;
    }
    getObjectInstance(id) {
        return this.objects.get(id);
    }
    async getObject(type) {
        if (!this.typeRegistry.has(type))
            throw new Error(`Type "${type}" is not registered.`);
        for (const [id, instance] of this.objects) {
            const typeInfo = this.typeRegistry.get(type);
            if (typeInfo && instance instanceof typeInfo.constructor) {
                return instance;
            }
        }
        const id = await this.createObject(type);
        const instance = this.objects.get(id);
        if (!instance)
            throw new Error(`Failed to create object of type ${type}`);
        return instance;
    }
    async setObjectBuffer(type) {
        const obj = await this.getObject(type);
        if (obj && 'getBuffers' in obj) {
            const buffers = await obj.getBuffers();
            return Array.isArray(buffers) ? buffers : buffers ? [buffers] : undefined;
        }
        return undefined;
    }
    getAllOfType(type) {
        const typeInfo = this.typeRegistry.get(type);
        if (!typeInfo)
            throw new Error(`Type "${type}" is not registered.`);
        return Array.from(this.objects.values()).filter(obj => obj instanceof typeInfo.constructor);
    }
    renderObject(id, device, passEncoder, viewProjectionMatrix, deltaTime) {
        const instance = this.objects.get(id);
        if (!instance)
            return;
        if ('draw' in instance && typeof instance.draw === 'function') {
            instance.draw(device, passEncoder, viewProjectionMatrix);
        }
        else if ('update' in instance && typeof instance.update === 'function') {
            instance.update(deltaTime);
        }
    }
    removeObject(id) {
        return this.objects.delete(id);
    }
    getAllObjects() {
        return Array.from(this.objects.values());
    }
    async ready() {
        await this.readyPromise;
    }
};
ObjectManager = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Object])
], ObjectManager);
export { ObjectManager };
