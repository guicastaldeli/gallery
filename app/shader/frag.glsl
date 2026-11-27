#version 430 core

layout(location = 0) in vec3 fragColor;
layout(location = 1) in vec2 fragUv;
layout(location = 2) flat in uint fragTexIndex;
layout(location = 3) flat in uint fragHasTexture;
layout(location = 4) in vec3 fragPosWorld;
layout(location = 5) in vec3 fragNormal;
layout(location = 6) flat in uint fragHasLit;
layout(location = 7) in vec3 fragInstanceColor;
layout(location = 8) flat in uint fragHasEmissive;
layout(location = 9) in float fragEmissiveIntensity;
layout(location = 10) in vec3 fragEmissiveColor;
layout(location = 11) flat in uint fragHasFog;

out vec4 FragColor;

void main() {
    FragColor = vec4(fragColor, 1.0);
}