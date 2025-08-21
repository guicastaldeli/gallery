import { Tick } from "./tick.js";
import { Camera } from "./camera.js";
import { Controller } from "./controller/controller.js";

export class Input {
    private lastTime: number = 0;
    private firstMouse: boolean = true;
    private isPointerLocked: boolean = false;
    private isRequestingLock: boolean = false;
    private interval: number = 500;
    private isPaused: boolean = false;
    private activePause: boolean = false;
    public _isCommandBarOpen: boolean = false;

    private tick?: Tick;
    private camera?: Camera;
    private keys: Record<string, boolean> = {};
    private controller?: Controller;

    constructor(
        tick?: Tick,
        camera?: Camera, 
        controller?: Controller
    ) {
        this.tick = tick;
        this.camera = camera;
        this.controller = controller;
    }

    public setupInputControls(canvas: HTMLCanvasElement): void {
        this.keys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if(!this.controller) return;

            if(this.isPointerLocked) {
                const xOffset = e.movementX;
                const yOffset = -e.movementY;
                this.controller.updateRotation(xOffset, yOffset);
            }
        });
        canvas.addEventListener('click', () => {
            setTimeout(() => {
                canvas.requestPointerLock = canvas.requestPointerLock;
                canvas.requestPointerLock();
            }, this.interval);
        });

        document.addEventListener('pointerlockchange', this.onPointerLock.bind(this, canvas));
        this.requestPointerLock(canvas);
        this.lastTime = performance.now();
        if(this.controller) this.initLoop(this.keys);
    }

    private requestPointerLock(canvas: HTMLCanvasElement): void {
        canvas.requestPointerLock = canvas.requestPointerLock;
    }

    public lockPointer(canvas: HTMLCanvasElement): void {
        if(this.isRequestingLock || this.isPointerLocked) return;
        this.isRequestingLock = true;
        canvas.requestPointerLock()
        .catch(err => {
            console.warn(err);
        })
        .finally(() => {
            this.isRequestingLock = false;
        });
    }

    private onPointerLock(canvas: HTMLCanvasElement): void {
        if(!this.tick) return;
        this.isPointerLocked = document.pointerLockElement === canvas;

        if(this.isPointerLocked) {
            setTimeout(() => {
                this.firstMouse = true;
                this.activePause = false;
                this.isPaused = false;
                if(this.tick) this.tick.resume(); 
            }, this.interval)
        } else {
            if(!this.activePause) {
                this.isPaused = true;
                this.clearKeys(); 
                this.tick.pause();
            }
        }
    }

    public exitPointerLock(pause: boolean = false): void {
        this.isPaused = false;
        this.activePause = pause;
        if(document.pointerLockElement) document.exitPointerLock();
    }

    public clearKeys(): void {
        for(const key in this.keys) this.keys[key] = false;
    }

    get isCommandBarOpen(): boolean {
        return this._isCommandBarOpen;
    }

    public setCommandBarOpen(state: boolean): void {
        this._isCommandBarOpen = state;
        if(state) this.clearKeys();
    }

    private update(
        controller: Controller,
        keys: Record<string, boolean>,
        time: number,
    ): void {
        if(!this.tick || !this.controller) return;
        if(!time || this.tick.isPaused) return;

        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        this.controller.updateInput(this.keys, deltaTime);
    }

    private initLoop(keys: Record<string, boolean>) {        
        const loop = (time: number) => {
            if(!this.controller) return;
            this.update(this.controller, keys, time);
            requestAnimationFrame(loop);
        }

        loop(performance.now());
    }
}