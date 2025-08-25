import { Chambers } from "./structures/chambers.js";
import { Floor } from "./structures/floor.js";
export class EnvRenderer {
    device;
    loader;
    shaderLoader;
    //Items
    chambers;
    floor;
    //Objects
    objectManager;
    constructor(device, loader, shaderLoader, objectManager) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
    }
    async update(deltaTime) {
        if (!this.objectManager)
            return;
    }
    async get() {
        const renderers = [
            ...this.floor.getData(),
            ...this.chambers.getData(),
        ];
        return renderers;
    }
    async render() {
        //Ground
        this.floor = new Floor(this.loader);
        await this.floor.init();
        //Chambers
        this.chambers = new Chambers(this.loader);
        await this.chambers.init();
    }
    async lateRenderer(passEncoder, viewProjectionMatrix) {
        await this.chambers.renderStencil(passEncoder, viewProjectionMatrix);
    }
}
