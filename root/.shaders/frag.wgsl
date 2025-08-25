@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;
@group(3) @binding(0) var<uniform> chamberColors: array<vec4f, 5>;
@group(3) @binding(1) var<uniform> hightlightedSide: i32;
@group(3) @binding(2) var<uniform> propColor: vec4f;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f,
    @location(5) cameraPos: vec3f,
    @location(6) isChamber: f32,
    @builtin(position) Position: vec4f
}

fn applyDither(color: vec3f, fragCoord: vec2f) -> vec3f {
    let ditherMatrix = array<array<f32, 4>, 4>(
        array<f32, 4>(0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0),
        array<f32, 4>(12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0),
        array<f32, 4>(3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0),
        array<f32, 4>(15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0)
    );

    let screenPos = vec2u(fragCoord);
    let x = screenPos.x % 4u;
    let y = screenPos.y % 4u;

    let threshold = ditherMatrix[y][x];
    let dithered = floor(color * 4.0 + threshold) / 5.0;
    return mix(color, dithered, 0.5);
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(textureMap, textureSampler, input.texCoord);

    let worldPos = input.worldPos;
    let dFdxPos = dpdx(worldPos);
    let dFdyPos = dpdy(worldPos);
    let calculatedNormal = normalize(input.worldPos);

    if(input.isChamber > 0.1) {
        /*
        let chamberIndex = clamp(i32(round(input.isChamber)), 0, 4);
        let chamberColor = chamberColors[chamberIndex].rgb;
        let alpha = texColor.a * 0.1;
        return vec4f(chamberColor, alpha);
        */

        let chamberIndex = clamp(i32(round(input.isChamber)), 0, 4);
        if(hightlightedSide >= 0) {
            let alpha = texColor.a * 0.1;
            return vec4f(propColor.rgb, alpha);
        }

        let chamberColor = chamberColors[chamberIndex].rgb;
        let alpha = texColor.a * 0.1;
        return vec4f(chamberColor, alpha);
    }

    var baseColor = mix(texColor.rgb, input.color, 0.1);
    
    var finalColor = applyAmbientLight(baseColor);
    finalColor += applyDirectionalLight(baseColor, calculatedNormal);

    finalColor = max(finalColor, vec3f(0.0));
    //finalColor = applyDither(finalColor, vec2f(input.Position.xy));
    return vec4f(finalColor, texColor.a);
}