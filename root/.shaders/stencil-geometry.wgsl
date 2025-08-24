struct Uniforms {
    modelViewProjection: mat4x4f,
    modelMatrix: mat4x4f,
    stencilValue: u32,
    faceColor: vec4f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f,
    @location(2) normal: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
    @location(1) normal: vec3f,
    @location(2) @interpolate(flat) faceId: u32,
    @location(3) color: vec4f
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    output.position = uniforms.modelViewProjection * vec4f(input.position, 1.0);
    output.texCoord = input.texCoord;
    output.normal = (uniforms.modelMatrix * vec4f(input.normal, 0.0)).xyz;
    output.faceId = uniforms.stencilValue;
    output.color = uniforms.faceColor;

    return output;
}

@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var texture: texture_2d<f32>;

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    if(input.faceId != uniforms.stencilValue) {
        discard;
    }

    return input.color;
}


