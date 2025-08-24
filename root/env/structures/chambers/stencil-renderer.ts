import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../../../shader-loader.js";

interface Shaders {
    stencilMask: GPUShaderModule;
    stencilGeometry: GPUShaderModule;
}

interface Buffers {
    mvp: GPUBuffer;
    modelMatrix: GPUBuffer;
    stencilValue: GPUBuffer;
    faceColor: GPUBuffer;
}

export class StencilRenderer {
    private device: GPUDevice;
    private canvas: HTMLCanvasElement;
    private shaderLoader: ShaderLoader;

    public stencilMaskPipeline!: GPURenderPipeline;
    public stencilGeometryPipeline!: GPURenderPipeline;
    public stencilTexture!: GPUTexture;
    public stencilMaskValues!: Uint32Array;
    public faceColors!: Float32Array[];

    private modelViewProjectionBuffer!: GPUBuffer;
    private modelMatrixBuffer!: GPUBuffer;
    private stencilValueBuffer!: GPUBuffer;
    private faceColorBuffer!: GPUBuffer;

    constructor(
        device: GPUDevice, 
        canvas: HTMLCanvasElement,
        shaderLoader: ShaderLoader
    ) {
        this.device = device;
        this.canvas = canvas;
        this.shaderLoader = shaderLoader;
        this.setColors();
        this.initBuffers();
    }

    private setColors(): void {
        this.faceColors = [
            new Float32Array([1.0, 0.0, 0.0, 1.0]), //Red
            new Float32Array([0.0, 1.0, 0.0, 1.0]), //Green
            new Float32Array([0.0, 0.0, 1.0, 1.0]), //Blue
            new Float32Array([1.0, 1.0, 0.0, 1.0]), //Yellow
            new Float32Array([1.0, 0.0, 1.0, 1.0]), //Magenta
            new Float32Array([0.0, 1.0, 1.0, 1.0]) //Cyan
        ];
    }

    private async loadShaders(): Promise<Shaders> {
        try {
            const [stencilMask, stencilGeometry] = await Promise.all([
                this.shaderLoader.loader('./.shaders/stencil-mask.wgsl'),
                this.shaderLoader.loader('./.shaders/stencil-geometry.wgsl')
            ]);

            return { stencilMask, stencilGeometry }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    //Resources
    public async initResources(): Promise<void> {
        this.stencilMaskValues = new Uint32Array([1, 2, 3, 4, 5, 6]);
        this.stencilTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.createBindGroupLayout()]
        })

        //Mask
        const stencilMaskShader = (await this.loadShaders()).stencilMask;

        this.stencilMaskPipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: stencilMaskShader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: stencilMaskShader,
                entryPoint: 'fs_main',
                targets: [{
                    format: 'r32uint',
                    writeMask: 0xFFFFFFFF
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: 'always',
                stencilFront: {
                    compare: 'always',
                    passOp: 'replace'
                },
                format: 'stencil8'
            }
        });

        //Geometry
        const stencilGeometryShader = (await this.loadShaders()).stencilGeometry;

        this.stencilGeometryPipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: stencilGeometryShader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: stencilGeometryShader,
                entryPoint: 'fs_main',
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        }
                    }
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                stencilFront: {
                    compare: 'equal',
                    passOp: 'keep'
                },
                format: 'depth24plus-stencil8'
            }
        });
    }

    //Pipeline Layout
    private createBindGroupLayout(): GPUBindGroupLayout {
        return this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                }
            ]
        });
    }

    //Buffers
        private initBuffers(): void {
            //View Projeciton
            this.modelViewProjectionBuffer = this.device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            
            //Model Matrix
            this.modelMatrixBuffer = this.device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            //Stencil Value
            this.stencilValueBuffer = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            //Face Color
            this.faceColorBuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        }

        public updateBuffers(
            modelViewProjectionMatrix: mat4,
            modelMatrix: mat4,
            stencilValue: number,
            faceColor: Float32Array
        ): Buffers {
            const mvpArray = new Float32Array(16);
            const modelArray = new Float32Array(16);

            for(let i = 0; i < 16; i++) {
                mvpArray[i] = modelViewProjectionMatrix[i];
                modelArray[i] = modelMatrix[i];
            }

            //Mvp Buffer
            this.device.queue.writeBuffer(
                this.modelViewProjectionBuffer,
                0,
                mvpArray.buffer
            );

            //Model Matrix
            this.device.queue.writeBuffer(
                this.modelMatrixBuffer,
                0,
                modelArray.buffer
            );

            //Stencil
            const stencilArray = new Uint32Array([stencilValue]);
            this.device.queue.writeBuffer(
                this.stencilValueBuffer,
                0,
                stencilArray.buffer
            );

            //Color
            this.device.queue.writeBuffer(
                this.faceColorBuffer,
                0,
                faceColor.buffer
            );

            return {
                mvp: this.modelViewProjectionBuffer,
                modelMatrix: this.modelMatrixBuffer,
                stencilValue: this.stencilValueBuffer,
                faceColor: this.faceColorBuffer
            }
        }

        public getBuffers(): Buffers {
            return {
                mvp: this.modelViewProjectionBuffer,
                modelMatrix: this.modelMatrixBuffer,
                stencilValue: this.stencilValueBuffer,
                faceColor: this.faceColorBuffer
            }
        }
    //

    public getStencilValueGeometry(block: any): number {
        const pos = vec3.fromValues(
            block.modelMatrix[12],
            block.modelMatrix[13],
            block.modelMatrix[14]
        );

        if (pos[2] > 0.4) return 1; //Front
        if (pos[2] < -0.4) return 2; //Back
        if (pos[0] > 0.4) return 3;  //Right
        if (pos[0] < -0.4) return 4; //Left
        if (pos[1] > 0.4) return 5;  //Top
        if (pos[1] < -0.4) return 6; //Bottom
        return 1;
    }

    public getFaceColor(faceIndex: number): Float32Array {
        return this.faceColors[faceIndex % this.faceColors.length];
    }

    public async init(): Promise<void> {
        await this.initResources();
    }
}