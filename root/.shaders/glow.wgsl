fn applyEmissiveGlow(
    baseColor: vec3f,
    worldPos: vec3f,
    normal: vec3f,
    isEmissive: f32,
    light: AmbientLight,
    cameraPos: vec3f
) -> vec3f {
    if(isEmissive < 0.5) {
        return vec3f(0.0);
    }

    let intensity = light.intensity * 20.0;
    let glowEffect = light.color * intensity * baseColor;
    return glowEffect;
}