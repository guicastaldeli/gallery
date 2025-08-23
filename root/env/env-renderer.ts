import { EnvBufferData } from "./env-buffers.js";
import { Loader } from "../loader.js";
import { ShaderLoader } from "../shader-loader.js";
import { ObjectManager } from "./obj/object-manager.js";
import { Chambers } from "./structures/chambers/chambers.js";
import { Floor } from "./structures/floor/floor.js";

export class EnvRenderer {
    private device: GPUDevice;
    private canvas: HTMLCanvasElement;
    public passEncoder: GPURenderPassEncoder;
    private loader: Loader;
    private shaderLoader: ShaderLoader;

    //Items
    public chambers!: Chambers;
    public floor!: Floor;

    //Objects
    public objectManager?: ObjectManager;

    constructor(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        passEncoder: GPURenderPassEncoder,
        loader: Loader,
        shaderLoader: ShaderLoader,
        objectManager?: ObjectManager
    ) {
        this.canvas = canvas;
        this.device = device;
        this.passEncoder = passEncoder;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
    }

    public async update(deltaTime: number): Promise<void> {
        if(!this.objectManager) return;
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers = [
            ...this.floor.getData(),
            ...this.chambers.getData(),
        ];

        return renderers;
    }

    public async render(): Promise<void> {
        //Ground
        this.floor = new Floor(this.loader);
        await this.floor.init();
        
        //Chambers
        this.chambers = new Chambers(
            this.canvas,
            this.device,
            this.passEncoder,
            this.loader, 
            this.shaderLoader
        );
        await this.chambers.init();
    }
}