#version 330 core

layout(location = 0) in vec3 inPosition;
layout(location = 1) in vec3 inNormal;
layout(location = 2) in vec2 inUv;
layout(location = 3) in vec3 inColor;

uniform mat4 view;
uniform mat4 proj;
uniform mat4 model;

out vec3 vNormal;
out vec2 vUv;
out vec3 vColor;

void main() {
    vec4 worldPos = model * vec4(inPosition, 1.0);
    gl_Position = proj * view * worldPos;
    vColor = inColor;
}