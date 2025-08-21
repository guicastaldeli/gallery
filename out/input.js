export class Input {
    lastTime = 0;
    firstMouse = true;
    isPointerLocked = false;
    isRequestingLock = false;
    interval = 500;
    isPaused = false;
    activePause = false;
    _isCommandBarOpen = false;
    tick;
    camera;
    keys = {};
    controller;
    constructor(tick, camera, controller) {
        this.tick = tick;
        this.camera = camera;
        this.controller = controller;
    }
    setupInputControls(canvas) {
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!this.controller)
                return;
            if (this.isPointerLocked) {
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
        if (this.controller)
            this.initLoop(this.keys);
    }
    requestPointerLock(canvas) {
        canvas.requestPointerLock = canvas.requestPointerLock;
    }
    lockPointer(canvas) {
        if (this.isRequestingLock || this.isPointerLocked)
            return;
        this.isRequestingLock = true;
        canvas.requestPointerLock()
            .catch(err => {
            console.warn(err);
        })
            .finally(() => {
            this.isRequestingLock = false;
        });
    }
    onPointerLock(canvas) {
        if (!this.tick)
            return;
        this.isPointerLocked = document.pointerLockElement === canvas;
        if (this.isPointerLocked) {
            setTimeout(() => {
                this.firstMouse = true;
                this.activePause = false;
                this.isPaused = false;
                if (this.tick)
                    this.tick.resume();
            }, this.interval);
        }
        else {
            if (!this.activePause) {
                this.isPaused = true;
                this.clearKeys();
                this.tick.pause();
            }
        }
    }
    exitPointerLock(pause = false) {
        this.isPaused = false;
        this.activePause = pause;
        if (document.pointerLockElement)
            document.exitPointerLock();
    }
    clearKeys() {
        for (const key in this.keys)
            this.keys[key] = false;
    }
    get isCommandBarOpen() {
        return this._isCommandBarOpen;
    }
    setCommandBarOpen(state) {
        this._isCommandBarOpen = state;
        if (state)
            this.clearKeys();
    }
    update(controller, keys, time) {
        if (!this.tick || !this.controller)
            return;
        if (!time || this.tick.isPaused)
            return;
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        this.controller.updateInput(this.keys, deltaTime);
    }
    initLoop(keys) {
        const loop = (time) => {
            if (!this.controller)
                return;
            this.update(this.controller, keys, time);
            requestAnimationFrame(loop);
        };
        loop(performance.now());
    }
}
