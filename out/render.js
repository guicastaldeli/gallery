import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { context, device } from "./init.js";
import { initBuffers } from "./buffers.js";
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
let pipeline;
let stencilPipeline;
let buffers;
let cachedBindGroups = null;
let passEncoder;
let viewProjectionMatrix;
let depthTexture = null;
let depthTextureWidth = 0;
let depthTextureHeight = 0;
let tick;
let camera;
let input;
let loader;
let shaderLoader;
let shaderComposer;
let controller;
let envRenderer;
let getColliders;
let skybox;
let lightningManager;
let objectManager;
let wireframeMode = false;
let wireframePipeline = null;
async function initShaders() {
    try {
        const [vertexSrc, fragSrc, ambientLightSrc, directionalLightSrc, glowSrc, stencilSrc] = await Promise.all([
            shaderLoader.loader('./.shaders/vertex.wgsl'),
            shaderLoader.sourceLoader('./.shaders/frag.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/ambient-light.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/directional-light.wgsl'),
            shaderLoader.sourceLoader('./.shaders/glow.wgsl'),
            shaderLoader.sourceLoader('./.shaders/stencil.wgsl'),
        ]);
        const combinedFragCode = await shaderComposer.combineShader(fragSrc, ambientLightSrc, directionalLightSrc, glowSrc, stencilSrc);
        console.log(combinedFragCode);
        return {
            vertexCode: vertexSrc,
            fragCode: combinedFragCode
        };
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
async function setBindGroups() {
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
        const chamberBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 80
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 16
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 16
                    },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 32
                    },
                }
            ]
        });
        return {
            bindGroupLayout,
            textureBindGroupLayout,
            lightningBindGroupLayout,
            chamberBindGroupLayout
        };
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
export async function getBindGroups() {
    if (!cachedBindGroups)
        cachedBindGroups = await setBindGroups();
    return cachedBindGroups;
}
async function initPipeline() {
    try {
        const { vertexCode, fragCode } = await initShaders();
        const fragCodeSrc = shaderComposer.createShaderModule(fragCode);
        const { bindGroupLayout, textureBindGroupLayout, lightningBindGroupLayout, chamberBindGroupLayout } = await getBindGroups();
        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayout,
                textureBindGroupLayout,
                lightningBindGroupLayout,
                chamberBindGroupLayout
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
                        //writeMask: 0,
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
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus-stencil8',
                stencilFront: {
                    compare: 'always',
                    failOp: 'keep',
                    depthFailOp: 'keep',
                    passOp: 'replace'
                },
                stencilBack: {
                    compare: 'always',
                    failOp: 'keep',
                    depthFailOp: 'keep',
                    passOp: 'replace'
                }
            }
        });
        stencilPipeline = device.createRenderPipeline({
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
                        //writeMask: 0 
                    }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus-stencil8',
                stencilFront: {
                    compare: 'always',
                    failOp: 'keep',
                    depthFailOp: 'keep',
                    passOp: 'replace'
                },
                stencilBack: {
                    compare: 'always',
                    failOp: 'keep',
                    depthFailOp: 'keep',
                    passOp: 'replace'
                }
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
                depthCompare: 'always',
                format: 'depth24plus-stencil8'
            }
        });
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
//Wireframe Mode
async function toggleWireframe() {
    document.addEventListener('keydown', async (e) => {
        if (e.key.toLowerCase() === 't') {
            wireframeMode = !wireframeMode;
            console.log(`Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
            await initPipeline();
        }
    });
}
toggleWireframe();
//
async function getPipeline(passEncoder) {
    const currentPipeline = wireframeMode ? wireframePipeline : pipeline;
    if (!currentPipeline)
        console.error('err pipeline');
    passEncoder.setPipeline(currentPipeline);
}
async function setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime) {
    const { bindGroupLayout, textureBindGroupLayout, lightningBindGroupLayout, chamberBindGroupLayout } = await getBindGroups();
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
    //Lightning
    const ambientLightBuffer = lightningManager.getLightBuffer('ambient');
    if (!ambientLightBuffer)
        throw new Error('Ambient light err');
    const directionalLightBuffer = lightningManager.getLightBuffer('directional');
    if (!directionalLightBuffer)
        throw new Error('Directional light err');
    const lightningBindGroup = lightningManager.getLightningBindGroup(depthTexture, lightningBindGroupLayout);
    if (!lightningBindGroup)
        throw new Error('Lightning group err');
    //
    //Chamber
    const chamberBindGroup = getChamberBindGroup(chamberBindGroupLayout, renderBuffers);
    if (!chamberBindGroup)
        throw new Error('chamber group err');
    //Stencil
    passEncoder.setPipeline(stencilPipeline);
    for (let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        if (data.isChamber && data.isChamber[0] > 0) {
            passEncoder.setStencilReference(data.isChamber[0]);
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
            uniformData.set([data.isChamber[0]], 53);
            device.queue.writeBuffer(uniformBuffer, offset, uniformData);
        }
    }
    for (let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        if (!data.sampler || !data.texture) {
            console.error('missing');
            continue;
        }
        if (data.isChamber && data.isChamber[0] > 0) {
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
            passEncoder.setBindGroup(3, chamberBindGroup);
            passEncoder.drawIndexed(data.indexCount);
        }
    }
    //
    //Pipeline
    await getPipeline(passEncoder);
    for (let i = 0; i < renderBuffers.length; i++) {
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
        const isChamber = data.isChamber ? data.isChamber[0] : 0.0;
        uniformData.set([isChamber], 53);
        device.queue.writeBuffer(uniformBuffer, offset, uniformData);
    }
    for (let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        if (!data.sampler || !data.texture) {
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
        if (data.isChamber && data.isChamber[0] > 0) {
            passEncoder.setStencilReference(data.isChamber[0]);
        }
        else {
            passEncoder.setStencilReference(0);
        }
        passEncoder.setVertexBuffer(0, data.vertex);
        passEncoder.setVertexBuffer(1, data.color);
        passEncoder.setIndexBuffer(data.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.setBindGroup(1, textureBindGroup);
        passEncoder.setBindGroup(2, lightningBindGroup);
        passEncoder.setBindGroup(3, chamberBindGroup);
        passEncoder.drawIndexed(data.indexCount);
    }
}
//Chamber
function getChamberBindGroup(layout, renderBuffers) {
    const stencilBuffer = device.createBuffer({
        size: 4 * renderBuffers.length,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const stencilValues = new Float32Array(renderBuffers.length);
    for (let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        stencilValues[i] = data.isChamber ? data.isChamber[0] : 0.0;
    }
    device.queue.writeBuffer(stencilBuffer, 0, stencilValues);
    return device.createBindGroup({
        layout: layout,
        entries: [
            {
                binding: 0,
                resource: { buffer: envRenderer.chambers.colorBuffer }
            },
            {
                binding: 1,
                resource: { buffer: envRenderer.chambers.hightlitedSideBuffer }
            },
            {
                binding: 2,
                resource: { buffer: envRenderer.chambers.propColorBuffer }
            },
            {
                binding: 3,
                resource: { buffer: stencilBuffer }
            }
        ]
    });
}
//Color Parser
export function parseColor(rgb) {
    const matches = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (!matches)
        throw new Error('Invalid RGB string or format!');
    return [
        parseInt(matches[1]) / 255,
        parseInt(matches[2]) / 255,
        parseInt(matches[3]) / 255
    ];
}
//Lightning
//Ambient
async function ambientLight() {
    const color = 'rgb(255, 255, 255)';
    const colorArray = parseColor(color);
    const light = new AmbientLight(colorArray, 0.3);
    lightningManager.addAmbientLight('ambient', light);
    lightningManager.updateLightBuffer('ambient');
}
//Directional
async function directionalLight() {
    const pos = {
        x: -10.0,
        y: 20.0,
        z: -15.0
    };
    const color = 'rgb(255, 255, 255)';
    const colorArray = parseColor(color);
    const direction = vec3.fromValues(pos.x, pos.y, pos.z);
    vec3.normalize(direction, direction);
    const light = new DirectionalLight(colorArray, direction, 1.0);
    lightningManager.addDirectionalLight('directional', light);
    lightningManager.updateLightBuffer('directional');
}
//
async function errorHandler() {
    await device.queue.onSubmittedWorkDone();
    const pipelineError = await device.popErrorScope();
    if (pipelineError)
        console.error('Pipeline error:', pipelineError);
}
//Env
async function renderEnv(deltaTime) {
    if (!envRenderer) {
        envRenderer = new EnvRenderer(device, loader, shaderLoader);
        await envRenderer.render();
        await envRenderer.update(deltaTime);
        objectManager.deps.floor = envRenderer.floor;
    }
}
async function lateRenderers(passEncoder, viewProjectionMatrix, deltaTime) {
    //Skybox
    if (!skybox) {
        skybox = new Skybox(tick, device, shaderLoader);
        await skybox.init();
    }
    await skybox.render(passEncoder, viewProjectionMatrix, deltaTime);
    await envRenderer.lateRenderer(passEncoder, viewProjectionMatrix);
}
export async function render(canvas) {
    try {
        device.pushErrorScope('validation');
        await errorHandler();
        const currentTime = performance.now();
        if (!tick)
            tick = new Tick();
        const deltaTime = tick.update(currentTime);
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
        //Render Related
        const format = navigator.gpu.getPreferredCanvasFormat();
        if (!loader)
            loader = new Loader(device);
        if (!shaderLoader)
            shaderLoader = new ShaderLoader(device);
        if (!shaderComposer)
            shaderComposer = new ShaderComposer(device);
        if (!pipeline)
            await initPipeline();
        //Lightning
        if (!lightningManager)
            lightningManager = new LightningManager(device);
        await ambientLight();
        await directionalLight();
        //Player Controller
        if (!controller)
            controller = new Controller(tick, input, undefined, getColliders);
        controller.update(deltaTime);
        //Objects
        if (!objectManager) {
            const deps = {
                tick,
                device,
                passEncoder: null,
                loader,
                shaderLoader,
                floor: envRenderer?.floor,
                lightningManager,
                canvas,
                controller,
                format,
                hud: null,
                viewProjectionMatrix: null,
                pipeline,
                weaponRenderer: null
            };
            objectManager = new ObjectManager(deps);
            await objectManager.ready();
            await renderEnv(deltaTime);
        }
        //Colliders
        if (!getColliders) {
            getColliders = new GetColliders(envRenderer);
            controller.setColliders(getColliders);
        }
        //Camera
        //Main
        if (!camera) {
            camera = new Camera(tick, device, pipeline, loader, shaderLoader, controller, lightningManager);
            camera.update(deltaTime);
        }
        //Input
        if (!input) {
            input = new Input(tick, camera, controller);
            input.setupInputControls(canvas);
        }
        //
        if (depthTexture &&
            (depthTextureWidth !== canvas.width ||
                depthTextureHeight !== canvas.height)) {
            await device.queue.onSubmittedWorkDone();
            depthTexture.destroy();
            depthTexture = null;
        }
        if (!depthTexture) {
            depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus-stencil8',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            depthTextureWidth = canvas.width;
            depthTextureHeight = canvas.height;
        }
        passEncoder = commandEncoder.beginRenderPass({
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
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store'
            }
        });
        passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
        passEncoder.setPipeline(pipeline);
        objectManager.deps.passEncoder = passEncoder;
        const modelMatrix = mat4.create();
        viewProjectionMatrix = mat4.create();
        const projectionMatrix = camera.getProjectionMatrix(canvas.width / canvas.height);
        const viewMatrix = camera.getViewMatrix();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        objectManager.deps.viewProjectionMatrix = viewProjectionMatrix;
        //Buffers
        await setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime);
        //**__ Late Renderers __**
        await lateRenderers(passEncoder, viewProjectionMatrix, deltaTime);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(() => render(canvas));
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
