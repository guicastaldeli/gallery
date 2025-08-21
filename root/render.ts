import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

import { context, device } from "./init.js";
import { initBuffers } from "./buffers.js";
import { BufferData } from "./buffers.js";

import { Tick } from "./tick.js";
import { Camera } from "./camera.js";
import { Input } from "./input.js";
import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";
import { ShaderComposer } from "./shader-composer.js";
import { Controller } from "./controller/controller.js";
import { EnvRenderer } from "./env/env-renderer.js";
import { GetColliders } from "./collision/get-colliders.js";

import { LightningManager } from "./lightning-manager.js";
import { ObjectManager } from "./env/obj/object-manager.js";

import { Skybox } from "./skybox/skybox.js";
import { AmbientLight } from "./lightning/ambient-light.js";
import { DirectionalLight } from "./lightning/directional-light.js";

interface Shaders {
    vertexCode: GPUShaderModule;
    fragCode: string;
}

interface BindGroupResources {
    bindGroupLayout: GPUBindGroupLayout;
    textureBindGroupLayout: GPUBindGroupLayout;
    lightningBindGroupLayout: GPUBindGroupLayout;
    pointLightBindGroupLayout: GPUBindGroupLayout;
}

let pipeline: GPURenderPipeline;
let buffers: BufferData;
let cachedBindGroups: BindGroupResources | null = null;

let depthTexture: GPUTexture | null = null;
let depthTextureWidth = 0;
let depthTextureHeight = 0;
let shadowDepthTexture: GPUTexture | null = null;
let shadowDepthTextureWidth = 0;
let shadowDepthTextureHeight = 0;

let tick: Tick;
let camera: Camera;
let input: Input;
let loader: Loader;
let shaderLoader: ShaderLoader;
let shaderComposer: ShaderComposer;
let controller: Controller;
let envRenderer: EnvRenderer;
let getColliders: GetColliders;
let skybox: Skybox;

let lightningManager: LightningManager;
let objectManager: ObjectManager;

let wireframeMode = false;
let wireframePipeline: GPURenderPipeline | null = null;

async function initShaders(): Promise<Shaders> {
    try {
        const [
            vertexSrc, 
            fragSrc,
            ambientLightSrc,
            directionalLightSrc,
            pointLightSrc,
            glowSrc
        ] = await Promise.all([
            shaderLoader.loader('./.shaders/vertex.wgsl'),
            shaderLoader.sourceLoader('./.shaders/frag.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/ambient-light.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/directional-light.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/point-light.wgsl'),
            shaderLoader.sourceLoader('./.shaders/glow.wgsl'),
        ]);

        const combinedFragCode = await shaderComposer.combineShader(
            fragSrc,
            ambientLightSrc,
            directionalLightSrc,
            pointLightSrc,
            glowSrc
        );
        
        return {
            vertexCode: vertexSrc,
            fragCode: combinedFragCode
        }
    } catch(err) {
        console.log(err);
        throw err;
    }
}

async function setBindGroups(): Promise<BindGroupResources> {
    try {
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { 
                        type: 'uniform',
                        hasDynamicOffset: true,
                        minBindingSize: 256
                    }
                }
            ]  
        });

        const textureBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]  
        });

        const lightningBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 64
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 32
                    }
                }
            ]
        });

        const pointLightBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'depth' }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'comparison' }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'depth' }
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'comparison' }
                }
            ]
        });

        return {
            bindGroupLayout, 
            textureBindGroupLayout,
            lightningBindGroupLayout,
            pointLightBindGroupLayout
        }
    } catch(err) {
        console.log(err);
        throw err;
    }
}

export async function getBindGroups(): Promise<BindGroupResources> {
    if(!cachedBindGroups) cachedBindGroups = await setBindGroups();
    return cachedBindGroups;
}

async function initPipeline(): Promise<void> {
    try {
        const { vertexCode, fragCode } = await initShaders();
        const fragCodeSrc = shaderComposer.createShaderModule(fragCode);
        
        const {
            bindGroupLayout, 
            textureBindGroupLayout,
            lightningBindGroupLayout,
            pointLightBindGroupLayout
        } = await getBindGroups();

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayout, 
                textureBindGroupLayout,
                lightningBindGroupLayout,
                pointLightBindGroupLayout
            ]
        });

        pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexCode,
                entryPoint: 'main',
                buffers: [
                    {
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
                                format: 'float32x3'
                            }
                        ]
                    },
                    {
                        arrayStride: 10 * 4,
                        attributes: [
                            {
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 4,
                                offset: 3 * 4,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 5,
                                offset: 5 * 4,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 6,
                                offset: 7 * 4,
                                format: 'float32x3'
                            }
                        ],
                    } 
                ]
            },
            fragment: {
                module: fragCodeSrc,
                entryPoint: 'main',
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
                cullMode: 'none',
                frontFace: 'ccw',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        wireframePipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexCode,
                entryPoint: 'main',
                buffers: [
                    {
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
                                format: 'float32x3'
                            }
                        ]
                    },
                    {
                        arrayStride: 10 * 4,
                        attributes: [
                            {
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 4,
                                offset: 3 * 4,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 5,
                                offset: 5 * 4,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 6,
                                offset: 7 * 4,
                                format: 'float32x3'
                            }
                        ],
                    }  
                ]
            },
            fragment: {
                module: fragCodeSrc,
                entryPoint: 'main',
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
                topology: 'line-list',
                cullMode: 'none',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
    } catch(err) {
        console.log(err);
        throw err;
    }
}

//Wireframe Mode
    async function toggleWireframe(): Promise<void> {
        document.addEventListener('keydown', async (e) => {
            if(e.key.toLowerCase() === 't') {
                wireframeMode = !wireframeMode;
                console.log(`Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
                await initPipeline();
            }
        });
    }

    toggleWireframe();
//

async function getPipeline(passEncoder: GPURenderPassEncoder): Promise<void> {
    const currentPipeline = wireframeMode ? wireframePipeline! : pipeline;
    if(!currentPipeline) console.error('err pipeline');
    passEncoder.setPipeline(currentPipeline);
}

async function setBuffers(
    passEncoder: GPURenderPassEncoder,
    viewProjectionMatrix: mat4,
    modelMatrix: mat4,
    currentTime: number
) {
    const { 
        bindGroupLayout, 
        textureBindGroupLayout,
        lightningBindGroupLayout,
        pointLightBindGroupLayout
    } = await getBindGroups();
    buffers = await initBuffers(device);
    mat4.identity(modelMatrix);
    
    const renderBuffers = [...await envRenderer.get()];
    const bufferSize = 512 * renderBuffers.length;
    const uniformBuffer = device.createBuffer({
        size: bufferSize * 5,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer,
                offset: 0,
                size: 256
            }
        }]
    });

    //Pipeline
    await getPipeline(passEncoder);

    //Lightning
        const ambientLightBuffer = lightningManager.getLightBuffer('ambient');
        if(!ambientLightBuffer) throw new Error('Ambient light err');

        const directionalLightBuffer = lightningManager.getLightBuffer('directional');
        if(!directionalLightBuffer) throw new Error('Directional light err');

        const pointLightBindGroup = lightningManager.getPointLightBindGroup(pointLightBindGroupLayout, shadowDepthTexture!);
        if(!pointLightBindGroup) throw new Error('Point light err');
        
        const lightningBindGroup = lightningManager.getLightningBindGroup(depthTexture!, lightningBindGroupLayout);
        if(!lightningBindGroup) throw new Error('Lightning group err');
    //

    for(let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        
        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjectionMatrix, data.modelMatrix);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, data.modelMatrix);
        
        const uniformData = new Float32Array(64);
        uniformData.set(mvp, 0);
        uniformData.set(data.modelMatrix, 16);
        uniformData.set(normalMatrix, 32);

        const cameraPos = camera.controller.getCameraPosition();
        uniformData.set(cameraPos, 48);
        uniformData.set([currentTime / 1000], 51);

        const isLamp = data.isLamp ? data.isLamp[0] > 0 : false;
        uniformData.set(isLamp ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0], 44);
        isLamp ? uniformData.set([1.0, 1.0, 1.0], 44) : uniformData.set([0.0, 0.0, 0.0], 44);

        const isEmissive = data.isEmissive ? data.isEmissive[0] > 0 : false;
        uniformData.set(isEmissive ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0], 53);
        isEmissive ? uniformData.set([1.0, 1.0, 1.0], 53) : uniformData.set([0.0, 0.0, 0.0], 53);
        
        device.queue.writeBuffer(uniformBuffer, offset, uniformData);
    }

    for(let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        
        if(!data.sampler || !data.texture) {
            console.error('missing');
            continue;
        }
        
        const textureBindGroup = device.createBindGroup({
            layout: textureBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: data.sampler
                },
                {
                    binding: 1,
                    resource: data.texture.createView()
                }
            ]
        });
        
        passEncoder.setVertexBuffer(0, data.vertex);
        passEncoder.setVertexBuffer(1, data.color);
        passEncoder.setIndexBuffer(data.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.setBindGroup(1, textureBindGroup);
        passEncoder.setBindGroup(2, lightningBindGroup);
        passEncoder.setBindGroup(3, pointLightBindGroup);
        passEncoder.drawIndexed(data.indexCount);
    }
}

//Color Parser
export function parseColor(rgb: string): [number, number, number] {
    const matches = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if(!matches) throw new Error('Invalid RGB string or format!');

    return [
        parseInt(matches[1]) / 255,
        parseInt(matches[2]) / 255,
        parseInt(matches[3]) / 255
    ];
}

//Lightning
    //Ambient
    async function ambientLight(): Promise<void> {
        const color = 'rgb(255, 255, 255)';
        const colorArray = parseColor(color);

        const light = new AmbientLight(colorArray, 0.3);
        lightningManager.addAmbientLight('ambient', light);
        lightningManager.updateLightBuffer('ambient');
    }

    //Directional
    async function directionalLight(): Promise<void> {
        const pos = {
            x: -10.0,
            y: 20.0,
            z: -15.0
        }
        
        const color = 'rgb(255, 255, 255)';
        const colorArray = parseColor(color);

        const direction = vec3.fromValues(pos.x, pos.y, pos.z);
        vec3.normalize(direction, direction);

        const light = new DirectionalLight(colorArray, direction, 0.0);
        lightningManager.addDirectionalLight('directional', light);
        lightningManager.updateLightBuffer('directional');
    }
//

async function errorHandler() {
    await device.queue.onSubmittedWorkDone();
    const pipelineError = await device.popErrorScope();
    if (pipelineError) console.error('Pipeline error:', pipelineError);
}

//Env
async function renderEnv(deltaTime: number): Promise<void> {
    if(!envRenderer) {
        envRenderer = new EnvRenderer(device, loader, shaderLoader, objectManager);
        await envRenderer.render();
        await envRenderer.update(deltaTime);
        objectManager.deps.ground = envRenderer.ground;
    }
}

async function lateRenderers(passEncoder: GPURenderPassEncoder, viewProjectionMatrix: mat4, deltaTime: number): Promise<void> {
    //Skybox
    if(!skybox) {
        skybox = new Skybox(tick, device, shaderLoader);
        await skybox.init();
    }
    await skybox.render(passEncoder, viewProjectionMatrix, deltaTime);
}

export async function render(canvas: HTMLCanvasElement): Promise<void> {
    try {
        device.pushErrorScope('validation');
        await errorHandler();    

        const currentTime = performance.now();
        if(!tick) tick = new Tick();
        const deltaTime = tick.update(currentTime);
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        //Render Related
        const format = navigator.gpu.getPreferredCanvasFormat();
        if(!loader) loader = new Loader(device);
        if(!shaderLoader) shaderLoader = new ShaderLoader(device);
        if(!shaderComposer) shaderComposer = new ShaderComposer(device);
        if(!pipeline) await initPipeline();

        //Lightning
        if(!lightningManager) lightningManager = new LightningManager(device);
        await ambientLight();
        await directionalLight();

        //Player Controller
        if(!controller) controller = new Controller(tick, input, undefined, getColliders);
        controller.update(deltaTime);

        //Objects
        if(!objectManager) {
            const deps = {
                tick,
                device,
                passEncoder: null,
                loader,
                shaderLoader,
                ground: envRenderer?.ground,
                lightningManager,
                canvas,
                controller,
                format,
                hud: null,
                viewProjectionMatrix: null,
                pipeline,
                weaponRenderer: null
            }
    
            objectManager = new ObjectManager(deps);
            await objectManager.ready();
            await renderEnv(deltaTime);
        }

        //Colliders
        if(!getColliders) {
            getColliders = new GetColliders(envRenderer);
            controller.setColliders(getColliders);
        }

        //Camera
            //Main
            if(!camera) {
                camera = new Camera(
                    tick, 
                    device, 
                    pipeline, 
                    loader, 
                    shaderLoader, 
                    controller, 
                    lightningManager
                );
                camera.update(deltaTime);
            }

            //Input
            if(!input) {
                input = new Input(tick, camera, controller);
                input.setupInputControls(canvas);
            }
        //

        if(depthTexture &&
            (depthTextureWidth !== canvas.width ||
            depthTextureHeight !== canvas.height)
        ) {
            await device.queue.onSubmittedWorkDone();
            depthTexture.destroy();
            depthTexture = null;
        }
        if(!depthTexture) {
            depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            depthTextureWidth = canvas.width;
            depthTextureHeight = canvas.height;
        }
        if(!shadowDepthTexture) {
            shadowDepthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.TEXTURE_BINDING
            });
            shadowDepthTextureWidth = canvas.width;
            shadowDepthTextureHeight = canvas.height;
        }
        
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        });
        passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
        passEncoder.setPipeline(pipeline);
        objectManager.deps.passEncoder = passEncoder;
    
        const modelMatrix = mat4.create();
        const viewProjectionMatrix = mat4.create();
        const projectionMatrix = camera.getProjectionMatrix(canvas.width / canvas.height);
        const viewMatrix = camera.getViewMatrix();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        objectManager.deps.viewProjectionMatrix = viewProjectionMatrix;

        //Buffers
        await setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime);

        //**__ Late Renderers __**
        await lateRenderers(passEncoder, viewProjectionMatrix, deltaTime);
        
        passEncoder.end();    
        device.queue.submit([ commandEncoder.finish() ]);
        requestAnimationFrame(() => render(canvas));
    } catch(err) {
        console.log(err);
        throw err;
    }
}