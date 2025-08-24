export class StencilRenderer {
    device;
    canvas;
    shaderLoader;
    stencilMaskPipeline;
    stencilGeometryPipeline;
    stencilTexture;
    stencilMaskValues;
    faceColors;
    modelViewProjectionBuffer;
    modelMatrixBuffer;
    stencilValueBuffer;
    faceColorBuffer;
    uniformBuffer;
    constructor(device, canvas, shaderLoader) {
        this.device = device;
        this.canvas = canvas;
        this.shaderLoader = shaderLoader;
        this.setColors();
        this.initBuffers();
        this.uniformBuffer = this.device.createBuffer({
            size: 16 * 4 + 16 * 4 + 4 + 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    setColors() {
        this.faceColors = [
            new Float32Array([1.0, 0.0, 0.0, 1.0]), //Red
            new Float32Array([0.0, 1.0, 0.0, 1.0]), //Green
            new Float32Array([0.0, 0.0, 1.0, 1.0]), //Blue
            new Float32Array([1.0, 1.0, 0.0, 1.0]), //Yellow
            new Float32Array([1.0, 0.0, 1.0, 1.0]), //Magenta
            new Float32Array([0.0, 1.0, 1.0, 1.0]) //Cyan
        ];
    }
    async loadShaders() {
        try {
            const [stencilMask, stencilGeometry] = await Promise.all([
                this.shaderLoader.loader('./.shaders/stencil-mask.wgsl'),
                this.shaderLoader.loader('./.shaders/stencil-geometry.wgsl')
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
            format: 'depth24plus-stencil8',
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
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 3 * 4,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            }
                        ]
                    }]
            },
            fragment: {
                module: stencilMaskShader,
                entryPoint: 'fs_main',
                targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat(),
                        writeMask: GPUColorWrite.ALL
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
                format: 'depth24plus-stencil8'
            }
        });
        //Geometry
        const stencilGeometryShader = (await this.loadShaders()).stencilGeometry;
        this.stencilGeometryPipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: stencilGeometryShader,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 8 * 4,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 1,
                                offset: 3 * 4,
                                format: 'float32x2'
                            },
                            {
                                shaderLocation: 2,
                                offset: 5 * 4,
                                format: 'float32x2'
                            }
                        ]
                    }]
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
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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
    initBuffers() {
        //View Projeciton
        this.modelViewProjectionBuffer = this.device.createBuffer({
            size: 160,
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
    createObjectBuffers() {
        const mvpBuffer = this.device.createBuffer({
            size: 160,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        //Model Matrix
        const modelMatrixBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        //Stencil Value
        const stencilValueBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        //Face Color
        const faceColorBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        return {
            mvp: mvpBuffer,
            modelMatrix: modelMatrixBuffer,
            stencilValue: stencilValueBuffer,
            faceColor: faceColorBuffer
        };
    }
    updateBuffers(buffers, modelViewProjectionMatrix, modelMatrix, stencilValue, faceColor) {
        const mvpArray = new Float32Array(16);
        const modelArray = new Float32Array(16);
        for (let i = 0; i < 16; i++) {
            mvpArray[i] = modelViewProjectionMatrix[i];
            modelArray[i] = modelMatrix[i];
        }
        //Mvp Buffer
        this.device.queue.writeBuffer(buffers.mvp, 0, mvpArray.buffer, mvpArray.byteOffset, mvpArray.byteLength);
        //Model Matrix
        this.device.queue.writeBuffer(buffers.modelMatrix, 0, modelArray.buffer, modelArray.byteOffset, modelArray.byteLength);
        //Stencil
        const stencilArray = new Uint32Array([stencilValue]);
        this.device.queue.writeBuffer(buffers.stencilValue, 0, stencilArray.buffer, stencilArray.byteOffset, stencilArray.byteLength);
        //Color
        this.device.queue.writeBuffer(buffers.faceColor, 0, faceColor.buffer, faceColor.byteOffset, faceColor.byteLength);
        return {
            mvp: this.modelViewProjectionBuffer,
            modelMatrix: this.modelMatrixBuffer,
            stencilValue: this.stencilValueBuffer,
            faceColor: this.faceColorBuffer
        };
    }
    getBuffers() {
        return {
            mvp: this.modelViewProjectionBuffer,
            modelMatrix: this.modelMatrixBuffer,
            stencilValue: this.stencilValueBuffer,
            faceColor: this.faceColorBuffer
        };
    }
    //
    getStencilValueGeometry(block) {
        return block.faceIndex !== undefined ? block.faceIndex + 1 : 1;
    }
    getFaceColor(faceIndex) {
        return this.faceColors[faceIndex % this.faceColors.length];
    }
    async init() {
        await this.initResources();
    }
}
