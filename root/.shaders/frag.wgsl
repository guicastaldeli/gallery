@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;

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
        let chamberColor = getChamberColor(input.isChamber, vec4f(texColor.rgb, texColor.a));
        
        var finalColor = applyAmbientLight(chamberColor.rgb);
        finalColor += applyDirectionalLight(chamberColor.rgb, calculatedNormal);
        finalColor = max(finalColor, vec3f(0.0));

        let color = vec4f(finalColor, texColor.a); 
        return color;
    }

    var baseColor = mix(texColor.rgb, input.color, 0.1);
    var sfColor = sf_main(vec4f(baseColor, texColor.a));
    
    var finalColor = applyAmbientLight(sfColor.rgb);
    finalColor += applyDirectionalLight(sfColor.rgb, calculatedNormal);
    finalColor = max(finalColor, vec3f(0.0));
    //finalColor = applyDither(finalColor, vec2f(input.Position.xy));

    let color = vec4f(finalColor, texColor.a);
    return color;
}