struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f,
    @location(2) normal: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
    @location(1) normal: vec3f,
    @location(2) faceId: u32
}

@group(0) @binding(0) var<uniform> modelViewProjection: mat4x4f;
@group(0) @binding(1) var<uniform> modelMatrix: mat4x4f;
@group(0) @binding(2) var<uniform> stencilValue: u32;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    output.position = modelViewProjection * vec4f(input.position, 1.0);
    output.texCoord = input.texCoord;
    output.normal = (modelMatrix * vec4f(input.normal, 0.0)).xyz;
    output.faceId = stencilValue;

    return output;
}

@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var texture: texture_2d<f32>;

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    if(input.faceId != stencilValue) {
        discard;
    }

    let texColor = textureSample(texture, textureSampler, input.texCoord);
    return texColor;
}


