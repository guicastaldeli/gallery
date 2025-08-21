import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class Camera {
    tick;
    device;
    pipeline;
    loader;
    shaderLoader;
    lightningManager;
    viewMatrix;
    projectionMatrix;
    _fov = 110;
    controller;
    constructor(tick, device, pipeline, loader, shaderLoader, controller, lightningManager) {
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
    getViewMatrix() {
        this.controller = this.controller;
        const cameraPos = this.controller.getCameraPosition();
        const target = vec3.create();
        vec3.add(target, cameraPos, this.controller.getForward());
        mat4.lookAt(this.viewMatrix, cameraPos, target, this.controller.getUp());
        return this.viewMatrix;
    }
    getProjectionMatrix(aspectRatio) {
        mat4.perspective(this.projectionMatrix, this._fov * Math.PI / 180, aspectRatio, 0.1, 100.0);
        return this.projectionMatrix;
    }
    getViewMatrixWithoutProjection() {
        const cameraPos = this.controller.getCameraPosition();
        const bobOffset = this.controller.getBobOffset();
        vec3.add(cameraPos, cameraPos, bobOffset);
        const target = vec3.create();
        vec3.add(target, cameraPos, this.controller.getForward());
        mat4.lookAt(this.viewMatrix, cameraPos, target, this.controller.getUp());
        return this.viewMatrix;
    }
    update(deltaTime) {
        const scaledDeltaTime = this.tick.getTimeScale() * deltaTime;
        const velocity = this.controller.getVelocity();
    }
}
