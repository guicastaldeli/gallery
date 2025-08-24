import mat4 from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "./env-buffers.js";
import { Loader } from "../loader.js";
import { ShaderLoader } from "../shader-loader.js";
import { ObjectManager } from "./obj/object-manager.js";
import { Chambers } from "./structures/chambers/chambers.js";
import { Floor } from "./structures/floor/floor.js";

export class EnvRenderer {
    private device: GPUDevice;
    private canvas: HTMLCanvasElement;
    public passEncoder!: GPURenderPassEncoder;
    private loader: Loader;
    private shaderLoader: ShaderLoader;
    public viewProjectionMatrix: mat4;

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
        viewProjectionMatrix: mat4,
        objectManager?: ObjectManager,
    ) {
        this.canvas = canvas;
        this.device = device;
        this.passEncoder = passEncoder;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
        this.viewProjectionMatrix = viewProjectionMatrix;
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
            this.loader, 
            this.shaderLoader
        );
        await this.chambers.init();
    }

    public async lateRenderer(): Promise<void> {
        await this.chambers.initStencil(this.viewProjectionMatrix, this.passEncoder);
    }
}