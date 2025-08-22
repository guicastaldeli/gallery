import { mat3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";

import { EnvBufferData } from "./env-buffers.js";
import { Controller } from "../controller/controller.js";
import { Loader } from "../loader.js";
import { ShaderLoader } from "../shader-loader.js";
import { Chambers } from "./chambers.js";
import { Ground } from "./ground.js";
import { ObjectManager } from "./obj/object-manager.js";

export class EnvRenderer {
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;

    //Items
    public chambers!: Chambers;
    public ground!: Ground;

    //Objects
    public objectManager?: ObjectManager;

    constructor(
        device: GPUDevice, 
        loader: Loader,
        shaderLoader: ShaderLoader,
        objectManager?: ObjectManager
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
    }

    public async update(deltaTime: number): Promise<void> {
        if(!this.objectManager) return;
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers = [
            ...this.ground.getData(),
            ...this.chambers.getData(),
        ];

        return renderers;
    }

    public async render(): Promise<void> {
        //Ground
        this.ground = new Ground(this.loader);
        await this.ground.init();
        
        //Chambers
        this.chambers = new Chambers(this.loader);
        await this.chambers.init();
    }
}