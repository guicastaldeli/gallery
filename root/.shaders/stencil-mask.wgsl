struct Uniforms {
    modelViewProjection: mat4x4f,
    modelMatrix: mat4x4f,
    stencilValue: u32,
    faceColor: vec4f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @builtin(instance_index) instance: u32
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(flat) faceId: u32,
    @location(1) color: vec4f
}


@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.modelViewProjection * vec4f(input.position, 1.0);
    output.faceId = input.instance;
    output.color = uniforms.faceColor;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    let stencilValue = f32(input.faceId + 1);
    return vec4f(stencilValue, 0.0, 0.0, 1.0);
}