export class LightningManager {
    device;
    lights = new Map();
    lightBuffers = new Map();
    pointCountBuffer = null;
    pointStorageBuffer = null;
    uniformBuffer = null;
    constructor(device) {
        this.device = device;
        this.initBuffer();
    }
    initBuffer() {
        this.uniformBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    addLight(id, type, light) {
        this.lights.set(id, { type, light });
        if (!this.lightBuffers.has(id)) {
            const bufferSize = {
                'ambient': 64,
                'directional': 32,
                'point': 64
            };
            this.lightBuffers.set(id, this.device.createBuffer({
                size: bufferSize[type],
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
        this.updateLightBuffer(id);
    }
    getLightBuffer(id) {
        return this.lightBuffers.get(id) ?? null;
    }
    getLight(id) {
        return this.lights.get(id)?.light || null;
    }
    updateLightBuffer(id) {
        const lightData = this.lights.get(id);
        const buffer = this.lightBuffers.get(id);
        if (!lightData || !buffer)
            return;
        const { type, light } = lightData;
        let data = null;
        switch (type) {
            case 'ambient':
                const ambientLight = light;
                data = new Float32Array(4);
                data.set(ambientLight.getColorWithIntensity(), 0);
                data[3] = ambientLight.intensity;
                this.device.queue.writeBuffer(buffer, 0, data.buffer);
                break;
            case 'directional':
                const directionalLight = light;
                const shaderData = directionalLight.getShaderData();
                this.device.queue.writeBuffer(buffer, 0, shaderData.buffer);
                break;
            default:
                return;
        }
    }
    updateAllLightBuffers() {
        this.lights.forEach((_, id) => this.updateLightBuffer(id));
    }
    //Lightning Group
    getLightningBindGroup(depthTexture, bindGroupLayout) {
        const ambientLightBuffer = this.getLightBuffer('ambient');
        const directionalLightBuffer = this.getLightBuffer('directional');
        if (!ambientLightBuffer || !directionalLightBuffer)
            throw new Error('ambient or directional err');
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: ambientLightBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: directionalLightBuffer }
                }
            ]
        });
    }
    //Ambient Light
    addAmbientLight(id, light) {
        this.addLight(id, 'ambient', light);
    }
    //Directional Light
    addDirectionalLight(id, light) {
        this.addLight(id, 'directional', light);
    }
}
