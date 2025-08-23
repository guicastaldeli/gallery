struct VertexInput {
    @location(0) position: vec3f,
    @builtin(instance_index) instance: u32
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) faceId: u32
}

@group(0) @binding(0) var<uniform> modelViewProjection: mat4x4f;
@group(0) @binding(1) var<uniform> stencilMask: array<u32, 6>;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = modelViewProjection * vec4f(input.position, 1.0);
    output.faceId = input.instance;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) u32 {
    return stencilMask[input.faceId];
}