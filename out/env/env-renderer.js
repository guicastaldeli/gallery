import { Chambers } from "./structures/chambers/chambers.js";
import { Floor } from "./structures/floor/floor.js";
export class EnvRenderer {
    device;
    canvas;
    passEncoder;
    loader;
    shaderLoader;
    viewProjectionMatrix;
    //Items
    chambers;
    floor;
    //Objects
    objectManager;
    constructor(canvas, device, passEncoder, loader, shaderLoader, viewProjectionMatrix, objectManager) {
        this.canvas = canvas;
        this.device = device;
        this.passEncoder = passEncoder;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
        this.viewProjectionMatrix = viewProjectionMatrix;
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
        this.chambers = new Chambers(this.canvas, this.device, this.loader, this.shaderLoader);
        await this.chambers.init();
    }
    async lateRenderer() {
        await this.chambers.initStencil(this.viewProjectionMatrix, this.passEncoder);
    }
}
