import { Chambers } from "./chambers.js";
import { Ground } from "./ground.js";
export class EnvRenderer {
    device;
    loader;
    shaderLoader;
    //Items
    chambers;
    ground;
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
            ...this.ground.getData(),
            ...this.chambers.getData(),
        ];
        return renderers;
    }
    async render() {
        //Ground
        this.ground = new Ground(this.loader);
        await this.ground.init();
        //Chambers
        this.chambers = new Chambers(this.loader);
        await this.chambers.init();
    }
}
