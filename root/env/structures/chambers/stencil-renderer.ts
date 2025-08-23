import mat4 from "../../../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../../../shader-loader.js";

interface Shaders {
    stencilMask: GPUShaderModule;
    stencilGeometry: GPUShaderModule;
}

interface Buffers {
    mvp: GPUBuffer;
    modelMatrix: GPUBuffer;
    stencilValue: GPUBuffer;
}

export class StencilRenderer {
    private device: GPUDevice;
    private canvas: HTMLCanvasElement;
    private passEncoder: GPURenderPassEncoder;
    private shaderLoader: ShaderLoader;

    public stencilMaskPipeline!: GPURenderPipeline;
    public stencilGeometryPipeline!: GPURenderPipeline;
    public stencilTexture!: GPUTexture;
    public stencilMaskValues!: Uint32Array;

    private modelViewProjectionBuffer!: GPUBuffer;
    private modelMatrixBuffer!: GPUBuffer;
    private stencilValueBuffer!: GPUBuffer;

    constructor(
        device: GPUDevice, 
        canvas: HTMLCanvasElement,
        passEncoder: GPURenderPassEncoder, 
        shaderLoader: ShaderLoader
    ) {
        this.device = device;
        this.canvas = canvas;
        this.passEncoder = passEncoder;
        this.shaderLoader = shaderLoader;
        this.initBuffers();
    }

    private async loadShaders(): Promise<Shaders> {
        try {
            const [stencilMask, stencilGeometry] = await Promise.all([
                this.shaderLoader.loader('./.shaders/stencil-mask.wgsl'),
                this.shaderLoader.loader('../../../.shaders/stencil-geometry.wgsl')
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
                }
            ]
        })
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
        }

        public updateBuffers(
            modelViewProjectionMatrix: mat4,
            modelMatrix: mat4,
            stencilValue: number
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

            return {
                mvp: this.modelViewProjectionBuffer,
                modelMatrix: this.modelMatrixBuffer,
                stencilValue: this.stencilValueBuffer
            }
        }

        public getBuffers(): Buffers {
            return {
                mvp: this.modelViewProjectionBuffer,
                modelMatrix: this.modelMatrixBuffer,
                stencilValue: this.stencilValueBuffer
            }
        }
    //

    public getStencilValueGeometry(block: any): number {
        if(block.position) {
            const pos = block.position;
            if (pos.z > 0.4) return 1; //Front
            if (pos.z < -0.4) return 2; //Back
            if (pos.x > 0.4) return 3;  //Right
            if (pos.x < -0.4) return 4; //Left
            if (pos.y > 0.4) return 5;  //Top
            if (pos.y < -0.4) return 6; //Bottom
        }
        
        return 1;
    }

    public async init(): Promise<void> {
        await this.initResources();
    }
}