import { mat3, mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export type EnvBufferData = {
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    modelMatrix: mat4;
    normalMatrix?: mat3;
    texture: GPUTexture;
    sampler: GPUSampler;
    indexData?: Uint16Array;
    isChamber?: vec3;
}

export async function initEnvBuffers(device: GPUDevice): Promise<EnvBufferData> {
    try {
        const vertexBuffer = await initEnvVertexBuffer(device);
        const colorBuffer = await initEnvColorBuffer(device);
        const { buffer: indexBuffer, count: indexCount } = await initEnvIndexBuffer(device);
    
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [-2, 0, 0]);

        const normalMatrix = mat3.create();
        mat3.fromMat4(normalMatrix, modelMatrix);
        mat3.invert(normalMatrix, normalMatrix);
        mat3.transpose(normalMatrix, normalMatrix);
    
        const texture = device.createTexture({
            size: [1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        device.queue.writeTexture(
            { texture },
            new Uint8Array([0, 0, 0, 0]),
            { bytesPerRow: 4 },
            [1, 1]
        );
        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });
    
        return {
            vertex: vertexBuffer,
            color: colorBuffer,
            index: indexBuffer,
            indexCount: indexCount,
            modelMatrix: modelMatrix,
            normalMatrix: normalMatrix,
            texture: texture,
            sampler: sampler,
            isChamber: [0.0, 0.0, 0.0]
        }
    } catch(err) {
        console.log(err);
        throw err;
    }
}

async function initEnvIndexBuffer(device: GPUDevice): Promise<{ buffer:GPUBuffer, count: number }> {
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23
    ]);

    const indexBuffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    new Uint16Array(indexBuffer.getMappedRange()).set(indices);
    indexBuffer.unmap();
    return { buffer: indexBuffer, count: indices.length }
}

async function initEnvVertexBuffer(device: GPUDevice): Promise<GPUBuffer> {
    const vertices = new Float32Array([
        -0.5, -0.5,  0.5,
        0.5, -0.5,  0.5,
        0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
        0.5,  0.5, -0.5,
        0.5, -0.5, -0.5,
        
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
        0.5,  0.5,  0.5,
        0.5,  0.5, -0.5,
        
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
        
        0.5, -0.5, -0.5,
        0.5,  0.5, -0.5,
        0.5,  0.5,  0.5,
        0.5, -0.5,  0.5,
        
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,
    ]);

    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();
    return vertexBuffer;
}

async function initEnvColorBuffer(device: GPUDevice): Promise<GPUBuffer> {
    const colors = new Float32Array([
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0
    ]);

    const colorBuffer = device.createBuffer({
        size: colors.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    new Float32Array(colorBuffer.getMappedRange()).set(colors);
    colorBuffer.unmap();
    return colorBuffer;
}
