namespace App.Util;

using OpenTK.Mathematics;

public class Transform {
    public Vector3 Position  = new(0, 0, 0);
    public Vector3 Rotation  = new(0, 0, 0);
    public Vector3 Scale     = new(1, 1, 1);
    public Vector3 Color     = new(1, 1, 1);

    public Matrix4 GetModelMatrix() {
        return Matrix4.CreateScale(Scale) *
           Matrix4.CreateRotationX(Rotation.X) *
           Matrix4.CreateRotationY(Rotation.Y) *
           Matrix4.CreateRotationZ(Rotation.Z) *
           Matrix4.CreateTranslation(Position);
    }
}