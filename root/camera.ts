import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

import { Tick } from "./tick.js";
import { Controller } from "./controller/controller.js";
import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";
import { LightningManager } from "./lightning-manager.js";
import { Raycaster } from "./env/structures/raycaster.js";

export class Camera {
    private tick: Tick;
    private device: GPUDevice;
    private pipeline: GPURenderPipeline;

    private loader: Loader;
    private shaderLoader: ShaderLoader;
    private lightningManager: LightningManager;

    private viewMatrix: mat4;
    private projectionMatrix: mat4;
    private _fov: number = 110;

    public controller: Controller;
    
    constructor(
        tick: Tick,
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        loader: Loader,
        shaderLoader: ShaderLoader,
        controller: Controller,
        lightningManager: LightningManager
    ) {
        this.tick = tick;
        this.device = device;
        this.pipeline = pipeline;

        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.lightningManager = lightningManager;

        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.controller = controller;
    }

    public getViewMatrix(): mat4 {
        this.controller = this.controller;
        const cameraPos = this.controller.getCameraPosition();
        const target = vec3.create();
        vec3.add(target, cameraPos, this.controller.getForward());
        mat4.lookAt(this.viewMatrix, cameraPos, target, this.controller.getUp());

        return this.viewMatrix;
    }

    public getProjectionMatrix(aspectRatio: number): mat4 {
        mat4.perspective(this.projectionMatrix, this._fov * Math.PI / 180, aspectRatio, 0.1, 100.0);
        return this.projectionMatrix;
    }

    public getViewMatrixWithoutProjection(): mat4 {
        const cameraPos = this.controller.getCameraPosition();
        const bobOffset = this.controller.getBobOffset();
        vec3.add(cameraPos, cameraPos, bobOffset);

        const target = vec3.create();
        vec3.add(target, cameraPos, this.controller.getForward());
        mat4.lookAt(this.viewMatrix, cameraPos, target, this.controller.getUp());

        return this.viewMatrix;
    }

    public getForwardDirection(): vec3 {
        return this.controller.getForward();
    }

    public getCameraPosition(): vec3 {
        return this.controller.getCameraPosition();
    }

    public getRay(): Raycaster {
        const origin = this.getCameraPosition();
        const direction = this.getForwardDirection();
        const instance = new Raycaster(origin, direction);
        return instance;
    }

    public update(deltaTime: number): void {
        const scaledDeltaTime = this.tick.getTimeScale() * deltaTime;
        const velocity = this.controller.getVelocity();
    }
}