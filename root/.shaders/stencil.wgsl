struct ChamberColors {
    colors: array<vec4<f32>, 5>
}

struct StencilUniform {
    stencilValue: f32,
    padding: vec3<f32>
}

@group(3) @binding(0) var<uniform> chamberColors: ChamberColors;
@group(3) @binding(1) var<uniform> hightlightedSide: vec4<f32>;
@group(3) @binding(2) var<uniform> propColor: vec4<f32>;
@group(3) @binding(3) var<uniform> stencilUniform: StencilUniform;

fn getChamberColor(stencilValue: f32, baseColor: vec4<f32>) -> vec4<f32> {
    if(stencilValue == 0.0) {
        return baseColor;
    }

    let index = clamp(i32(round(stencilValue)), 0, 4);
    return chamberColors.colors[index];
}

fn applyHighlight(color: vec4<f32>, stencilValue: f32) -> vec4<f32> {
    if(i32(stencilValue) == i32(hightlightedSide.x)) {
        return mix(color, hightlightedSide, 0.5);
    }
    return color;
}

fn sf_main(baseColor: vec4<f32>) -> vec4<f32> {
    let stencilValue = stencilUniform.stencilValue;
    var color = getChamberColor(stencilValue, baseColor);
    //color = applyHighlight(color, stencilValue);
    return color;
}