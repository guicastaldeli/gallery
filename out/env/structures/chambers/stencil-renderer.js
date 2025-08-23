export class StencilRenderer {
    device;
    canvas;
    passEncoder;
    shaderLoader;
    stencilMaskPipeline;
    stencilGeometryPipeline;
    stencilTexture;
    stencilMaskValues;
    modelViewProjectionBuffer;
    modelMatrixBuffer;
    stencilValueBuffer;
    constructor(device, canvas, passEncoder, shaderLoader) {
        this.device = device;
        this.canvas = canvas;
        this.passEncoder = passEncoder;
        this.shaderLoader = shaderLoader;
        this.initBuffers();
    }
    async loadShaders() {
        try {
            const [stencilMask, stencilGeometry] = await Promise.all([
                this.shaderLoader.loader('./.shaders/stencil-mask.wgsl'),
                this.shaderLoader.loader('../../../.shaders/stencil-geometry.wgsl')
            ]);
            return { stencilMask, stencilGeometry };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    //Resources
    async initResources() {
        this.stencilMaskValues = new Uint32Array([1, 2, 3, 4, 5, 6]);
        this.stencilTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.createBindGroupLayout()]
        });
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
    createBindGroupLayout() {
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
        });
    }
    //Buffers
    initBuffers() {
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
    updateBuffers(modelViewProjectionMatrix, modelMatrix, stencilValue) {
        const mvpArray = new Float32Array(16);
        const modelArray = new Float32Array(16);
        for (let i = 0; i < 16; i++) {
            mvpArray[i] = modelViewProjectionMatrix[i];
            modelArray[i] = modelMatrix[i];
        }
        //Mvp Buffer
        this.device.queue.writeBuffer(this.modelViewProjectionBuffer, 0, mvpArray.buffer);
        //Model Matrix
        this.device.queue.writeBuffer(this.modelMatrixBuffer, 0, modelArray.buffer);
        return {
            mvp: this.modelViewProjectionBuffer,
            modelMatrix: this.modelMatrixBuffer,
            stencilValue: this.stencilValueBuffer
        };
    }
    getBuffers() {
        return {
            mvp: this.modelViewProjectionBuffer,
            modelMatrix: this.modelMatrixBuffer,
            stencilValue: this.stencilValueBuffer
        };
    }
    //
    getStencilValueGeometry(block) {
        if (block.position) {
            const pos = block.position;
            if (pos.z > 0.4)
                return 1; //Front
            if (pos.z < -0.4)
                return 2; //Back
            if (pos.x > 0.4)
                return 3; //Right
            if (pos.x < -0.4)
                return 4; //Left
            if (pos.y > 0.4)
                return 5; //Top
            if (pos.y < -0.4)
                return 6; //Bottom
        }
        return 1;
    }
    async init() {
        await this.initResources();
    }
}
