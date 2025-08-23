import { Chambers } from "./structures/chambers/chambers.js";
import { Floor } from "./structures/floor/floor.js";
export class EnvRenderer {
    device;
    canvas;
    passEncoder;
    loader;
    shaderLoader;
    //Items
    chambers;
    floor;
    //Objects
    objectManager;
    constructor(canvas, device, passEncoder, loader, shaderLoader, objectManager) {
        this.canvas = canvas;
        this.device = device;
        this.passEncoder = passEncoder;
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
        this.chambers = new Chambers(this.canvas, this.device, this.passEncoder, this.loader, this.shaderLoader);
        await this.chambers.init();
    }
}
