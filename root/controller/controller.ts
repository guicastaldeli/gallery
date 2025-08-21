import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { Tick } from "../tick.js";
import { Input } from "../input.js";
import { Rigidbody } from "./rigidbody.js";
import { BoxCollider, Collider, CollisionResponse, ICollidable } from "../collision/collider.js";
import { GetColliders } from "../collision/get-colliders.js";

export class Controller implements ICollidable {
    private tick: Tick;
    private input: Input;

    private _initialPosition: vec3;
    private _position: vec3 = vec3.fromValues(10, 3, 10);
    private _forward: vec3 = vec3.fromValues(0, 0, -1);
    private _up: vec3 = vec3.fromValues(0, 1, 0);
    private _right: vec3;
    
    private _worldUp: vec3 = vec3.fromValues(0, 1, 0);
    private _cameraOffset: vec3 = vec3.fromValues(0, 0, 0);
    
    public yaw: number = -90;
    public pitch: number = 0;
        
    private _movSpeed: number = 7.0;
    private _mouseSensv: number = 0.4;

    public _Rigidbody: Rigidbody;
    private _Collider: Collider;
    public _Collidables: ICollidable[] = [];
    private _GetColliders: GetColliders;

    //Movement
    public _isMoving: boolean = true;
    private _movementTimer: number = 0.0;
    private _bobIntensity: number = 0.3;
    private _bobSpeed: number = 40.0;
    private _bobOffset: vec3 = vec3.create();
    private _lastMovingState: boolean = false;
    private _movmentStateChangeTime: number = 0.0;
    private _movementStateDelay: number = 0.1;
        
    constructor(
        tick: Tick,
        input: Input,
        _initialPosition?: vec3, 
        collidables?: GetColliders,
    ) {
        this.tick = tick;
        this.input = input;

        this._position = this._initialPosition ? vec3.clone(this._initialPosition) : this._position;
        this._forward = this._forward ? vec3.clone(this._forward) : this._forward;
        this._worldUp = this._worldUp ? vec3.clone(this._worldUp) : this._worldUp;
        this._up = this._up ? vec3.clone(this._worldUp) : this._up;
        this._right = vec3.create();

        this.updateVectors();
        this._Rigidbody = new Rigidbody();
        this._Collider = new BoxCollider([0.5, 5.0, 0.4]);
        this._GetColliders = collidables || new GetColliders();
        this._Collidables = this._GetColliders.getCollidables();
    }

    public setColliders(colliders: GetColliders): void {
        this._GetColliders = colliders;
        this.updateCollidables();
    }
    
    private updateVectors(): void {
        this._forward[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        this._forward[1] = Math.sin(this.pitch * Math.PI / 180);
        this._forward[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
    
        vec3.normalize(this._forward, this._forward);
        vec3.cross(this._right, this._forward, this._worldUp);
        vec3.normalize(this._right, this._right);
        vec3.cross(this._up, this._right, this._forward);
        vec3.normalize(this._up, this._up);
    } 
    
    public getCameraPosition(): vec3 {
        const cameraPos = vec3.create();
        vec3.add(cameraPos, this._position, this._cameraOffset);
        vec3.add(cameraPos, cameraPos, this._bobOffset);
        return cameraPos;
    }

    public setKeyboard(
        direction: string, 
        deltaTime: number,
        moveDirection: vec3
    ): void {
        if(this.input && this.input.isCommandBarOpen) {
            this.clearForces();
            return;
        }
        if(this.tick.isPaused) {
            this.clearForces();
            return;
        }
        
        const velocity = this._movSpeed * deltaTime;
    
        if(direction === 'FORWARD') {
            const forwardXZ = vec3.fromValues(this._forward[0], 0, this._forward[2]);
            vec3.normalize(forwardXZ, forwardXZ);
            vec3.scaleAndAdd(moveDirection, moveDirection, forwardXZ, velocity * 10);
        }
        if(direction === 'BACKWARD') {
            const backwardXZ = vec3.fromValues(this._forward[0], 0, this._forward[2]);
            vec3.normalize(backwardXZ, backwardXZ);
            vec3.scaleAndAdd(moveDirection, moveDirection, backwardXZ, -velocity * 10);
        }
        if(direction === 'LEFT') {
            const leftXZ = vec3.fromValues(this._right[0], 0, this._right[2]);
            vec3.normalize(leftXZ, leftXZ);
            vec3.scaleAndAdd(moveDirection, moveDirection, leftXZ, -velocity * 10);
        }
        if(direction === 'RIGHT') {
            const rightXZ = vec3.fromValues(this._right[0], 0, this._right[2]);
            vec3.normalize(rightXZ, rightXZ);
            vec3.scaleAndAdd(moveDirection, moveDirection, rightXZ, velocity * 10);
        }
    }

    public updateInput(
        keys: Record<string, boolean>,
        deltaTime: number,
    ): void {
        if(this.input && this.input.isCommandBarOpen) {
            this.clearForces();
            return;
        }

        const moveDirection = vec3.create();
        const velocity = this._movSpeed * deltaTime;
        
        for(const key in keys) {
            if(key === ' ') continue;

            if(keys[key]) {
                switch(key.toLowerCase()) {
                    case 'w':
                    this.setKeyboard('FORWARD', deltaTime, moveDirection);
                    break;
                case 's':
                    this.setKeyboard('BACKWARD', deltaTime, moveDirection);
                    break;
                case 'a':
                    this.setKeyboard('LEFT', deltaTime, moveDirection);
                    break;
                case 'd':
                    this.setKeyboard('RIGHT', deltaTime, moveDirection);
                    break;
                }
            }
        };

        const moveLength = vec3.length(moveDirection);
        if(moveLength > 0.0) {
            vec3.normalize(moveDirection, moveDirection);
            vec3.scale(moveDirection, moveDirection, moveLength > velocity * 10 ? velocity * 10 : moveLength);
            this._Rigidbody.addForce(moveDirection);
        }
    }

    public getPosition(): vec3 { 
        return this._position; 
    }

    public addCollidable(collidable: ICollidable): void {
        this._Collidables.push(collidable);
    }

    private checkCollisions(): void {
        const box = this._Collider.getBoundingBox(this._position);

        for(const collidable of this._Collidables) {
            if(collidable === this) continue;
            const otherBox = collidable.getCollider().getBoundingBox(collidable.getPosition());

            if(this.checkAABBCollision(box, otherBox)) {
                this.resolveCollision(box, otherBox);
                if(collidable.onCollision) collidable.onCollision(this);
                //if(collidable.onCollision) this.onCollision(collidable);
            }
        }
    }

    public removeCollidable(collidableToRemove: ICollidable): void {
        if(!collidableToRemove) return;

        this._Collidables = this._Collidables.filter(collidable => {
            if(!collidable) return false;
            if(collidable === collidableToRemove) return false;

            try {
                if('id' in collidable && 'id' in collidableToRemove &&
                    (collidable as any).id === (collidableToRemove as any)
                ) {
                    return false;
                }
            } catch(err) {
                console.warn(err)
            }

            try {
                const pos1 = collidable.getPosition();
                const pos2 = collidableToRemove.getPosition();
                if(vec3.equals(pos1, pos2)) return false;
            } catch(err) {
                return true;
            }

            return true;
        });
    }

    public onCollision(other: ICollidable): void {
        const collisionInfo = other.getCollisionInfo?.();
        console.log('Collision with:', collisionInfo?.type || 'unknown');
    }

    public getCollider(): Collider {
        return this._Collider;
    }

    public updateCollidables(): void {
        this._Collidables = this._GetColliders.getCollidables();
    }

    private checkAABBCollision(
        a: { min: vec3, max: vec3 },
        b: { min: vec3, max: vec3 },
    ): boolean {
        return (
            a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
            a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
            a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
        );
    }

    private resolveCollision(
        box: { min: vec3, max: vec3 },
        otherBox: { min: vec3, max: vec3 },
    ): void {
        const overlaps = vec3.fromValues(
            Math.min(box.max[0], otherBox.max[0]) - Math.max(box.min[0], otherBox.min[0]),
            Math.min(box.max[1], otherBox.max[1]) - Math.max(box.min[1], otherBox.min[1]),
            Math.min(box.max[2], otherBox.max[2]) - Math.max(box.min[2], otherBox.min[2])
        );

        let minAxis = 0;
        for(let i = 1; i < 3; i++) {
            if(overlaps[i] < overlaps[minAxis]) {
                minAxis = i;
            }
        }

        const depth = overlaps[minAxis];
        const correction = vec3.create();
        correction[minAxis] = depth * 0.1;

        const playerCenter = vec3.fromValues(
            (box.min[0] + box.max[0]) / 2,
            (box.min[1] + box.max[1]) / 2,
            (box.min[2] + box.max[2]) / 2,
        );
        const otherCenter = vec3.fromValues(
            (otherBox.min[0] + otherBox.max[0]) / 2,
            (otherBox.min[1] + otherBox.max[1]) / 2,
            (otherBox.min[2] + otherBox.max[2]) / 2,
        );

        const direction = vec3.create();
        vec3.sub(direction, playerCenter, otherCenter);

        if(minAxis === 1) {
            if(direction[1] > 0) this._Rigidbody.isColliding = true;
            this._position[1] += correction[1];
            if(direction[1] > 0 && this._Rigidbody.velocity[1] < 0) this._Rigidbody.velocity[1] = 0;
            if(direction[1] < 0 && this._Rigidbody.velocity[1] > 0) this._Rigidbody.velocity[1] = 0;
        } else {
            this._position[minAxis] += direction[minAxis] > 0 ? correction[minAxis] : -correction[minAxis];
        }

        this._Rigidbody.velocity[minAxis] = 0;
    }

    public clearForces(): void {
        if(this._Rigidbody) vec3.set(this._Rigidbody.velocity, 0, 0, 0);
    }

    public updateRotation(xOffset: number, yOffset: number): void {
        xOffset *= this._mouseSensv;
        yOffset *= this._mouseSensv;

        this.yaw += xOffset;
        this.pitch += yOffset;
        if(this.pitch > 89.0) this.pitch = 89.0;
        if(this.pitch < -89.0) this.pitch = -89.0;
        this.updateVectors();
    }

    private updateMovAnimation(deltaTime: number): void {
        if(this._isMoving) {
            const speedFactor = Math.min(1, vec3.length(this._Rigidbody.velocity) / this._movSpeed);
            this._movementTimer += deltaTime * this._bobSpeed * speedFactor;
            const bobAmount = Math.sin(this._movementTimer);
            this._bobOffset[1] = bobAmount * this._bobIntensity * speedFactor;
            this._bobOffset[0] = Math.sin(this._movementTimer * 0.5) * this._bobIntensity * 0.5 * speedFactor;
        } else {
            vec3.lerp(this._bobOffset, this._bobOffset, vec3.fromValues(0, 0, 0), deltaTime * 5.0);
            this._movementTimer = 0.0;
        }
    }
    
    public getForward(): vec3 { return this._forward; }
    public getUp(): vec3 { return this._up; }
    public getRight(): vec3 { return this._right; }
    public getVelocity(): vec3 { return this._Rigidbody.velocity; }
    public getBobOffset(): vec3 { return this._bobOffset; }
    
    public update(deltaTime: number): void {
        if(this.tick.isPaused || (this.input && this.input.isCommandBarOpen)) {
            this.clearForces();
            return;
        }

        const horizVelocity = vec3.fromValues(
            this._Rigidbody.velocity[0],
            0,
            this._Rigidbody.velocity[2]
        );
        const velocity = vec3.length(horizVelocity);
        const isGrounded = this._Rigidbody.isColliding && Math.abs(this._Rigidbody.velocity[1]) < 0.1;
        const activeMove = velocity > 0.1;

        if(activeMove && isGrounded) {
            if(!this._lastMovingState) {
                this._movmentStateChangeTime += deltaTime;
                if(this._movmentStateChangeTime >= this._movementStateDelay) {
                    this._isMoving = true;
                    this._lastMovingState = true;
                    this._movmentStateChangeTime = 0.0;
                }
            } else {
                this._isMoving = true;
            }
        } else {
            if(this._lastMovingState) {
                this._movmentStateChangeTime += deltaTime;
                if(this._movmentStateChangeTime >= this._movementStateDelay) {
                    this._isMoving = false;
                    this._lastMovingState = false;
                    this._movmentStateChangeTime = 0.0;
                }
            } else {
                this._isMoving = false;
            }
        }

        this.updateMovAnimation(deltaTime);
        this._Rigidbody.isColliding = false;
        this.checkCollisions();
        this._Rigidbody.update(deltaTime, this._position);
    }
}