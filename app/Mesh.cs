using System.Runtime.InteropServices;
using OpenTK.Graphics.ES30;
using OpenTK.Mathematics;

namespace App;

/// ------------------------------
/// Vertex
/// ------------------------------
[StructLayout(LayoutKind.Sequential)]
public struct Vertex {
    public float px, py, pz;
    public float nx, ny, nz;
    public float u, v;
    public float r, g, b;

    public const int Stride = sizeof(float) * 11;
}

/// ------------------------------
/// DataInstance
/// ------------------------------
[StructLayout(LayoutKind.Sequential)]
public struct DataInstance {
    public Matrix4 model;
    public uint texId;
    public uint hasTexture;
    public uint hasLit;
    public Vector3 color;
    public const int Stride = 88;
}

/// ------------------------------
/// Mesh
/// ------------------------------
public class Mesh {
    // --- Buffer Data ---
    private sealed class BufferData {
        public int vao, vbo, ibo;
        public int indexCount;
        public Vector3 minBounds, maxBounds;
        public void Dispose() {
            GL.DeleteBuffer(vbo);
            GL.DeleteBuffer(ibo);
            GL.DeleteVertexArray(vao);
        }
    }
    ////

    // --- MeshData ---
    private sealed class MeshData {
        public List<float> vertices = new();
        public List<uint> indices = new();
        public Vector3 minBounds, maxBounds;
    }
    ////
    
    // --- InstanceEntry ---
    private sealed class InstanceEntry {
        public uint id;
        public string type = "";
    }
    ////
    
    // --- Bounds ---
    public struct Bounds {
        public Vector3 min, max;
        public Vector3 center => new((min.X+max.X), (min.Y+max.Y), (min.Z+max.Z));
        public Vector3 size => new(max.X-min.X, max.Y-min.Y, max.Z-min.Z);
    }
    ////
    
    private readonly Dictionary<string, BufferData> bufferMeshes = new();
}