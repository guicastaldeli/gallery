import { mat3, mat4 } from "../../../node_modules/gl-matrix/esm/index.js";
export class StencilRenderer {
    async renderMasks(passEncoder, viewProjectionMatrix, chamberData) {
        try {
            passEncoder.setStencilReference(0);
            for (let i = 0; i < chamberData.length; i++) {
                const data = chamberData[i];
                if (!data.isChamber || data.isChamber[0] === 0)
                    continue;
                const mvp = mat4.create();
                mat4.multiply(mvp, viewProjectionMatrix, data.modelMatrix);
                const normalMatrix = mat3.create();
                mat3.normalFromMat4(normalMatrix, data.modelMatrix);
                const uniformData = new Float32Array(64);
                uniformData.set(mvp, 0);
                uniformData.set(data.modelMatrix, 16);
                uniformData.set(normalMatrix, 32);
                const stencilValue = data.isChamber[0];
                passEncoder.setStencilReference(stencilValue);
            }
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
