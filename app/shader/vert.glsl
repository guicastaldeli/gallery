#version 430 core

layout(location = 0) in vec3 inPosition;
layout(location = 1) in vec3 inNormal;
layout(location = 2) in vec2 inUv;
layout(location = 3) in vec3 inColor;

uniform mat4 view;
uniform mat4 proj;

struct InstanceData {
    mat4 model;
    uint texId;
    uint hasTexture;
    uint hasLit;
    vec3 color;
    uint hasEmissive;
    float emissiveIntensity;
    vec3 emissiveColor;
    uint hasFog;
};

layout(std430, binding = 0) buffer InstanceBuffer {
    InstanceData instances[];
};

uniform uint Instance;

layout(location = 0) out vec3 fragColor;
layout(location = 1) out vec2 fragUv;
layout(location = 2) flat out uint fragTexIndex;
layout(location = 3) flat out uint fragHasTexture;
layout(location = 4) out vec3 fragPosWorld;
layout(location = 5) out vec3 fragNormal;
layout(location = 6) flat out uint fragHasLit;
layout(location = 7) out vec3 fragInstanceColor;
layout(location = 8) flat out uint fragHasEmissive;
layout(location = 9) out float fragEmissiveIntensity;
layout(location = 10) out vec3 fragEmissiveColor;
layout(location = 11) flat out uint fragHasFog;

void main() {
    uint idx = Instance + uint(gl_InstanceID);
    InstanceData me = instances[idx];

    vec4 worldPos = me.model * vec4(inPosition, 1.0);
    gl_Position = proj * view * worldPos;

    fragColor = inColor;
    fragUv = inUv;
    fragTexIndex = me.texId;
    fragHasTexture = me.hasTexture;
    fragHasLit = me.hasLit;
    fragInstanceColor = me.color;
    fragHasEmissive = me.hasEmissive;
    fragEmissiveIntensity = me.emissiveIntensity;
    fragEmissiveColor = me.emissiveColor;
    fragHasFog = me.hasFog;
    fragPosWorld = worldPos.xyz;
    fragNormal = normalize(mat3(me.model) * inNormal);
}