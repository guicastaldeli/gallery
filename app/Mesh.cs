namespace App;

using App.Util;
using System.Runtime.InteropServices;
using OpenTK.Graphics.OpenGL4;
using OpenTK.Mathematics;

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
    public uint _pad0;
    public Vector3 color;
    public uint hasEmissive;
    public float emissiveIntensity; 
    public float _pad1;
    public float _pad2;
    public float _pad3;
    public Vector3 emissiveColor;
    public uint hasFog;
    public const int Stride = 128;
}

/// ------------------------------
/// Mesh
/// ------------------------------
public class Mesh {
    /* Buffer Data */
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
    /* */
    
    /* Instance Entry */
    private sealed class InstanceEntry {
        public uint id;
        public string type = "";
    }
    /* */
    
    /* Bounds */
    public struct Bounds {
        public Vector3 min, max;
        public Vector3 center => new((min.X+max.X), (min.Y+max.Y), (min.Z+max.Z));
        public Vector3 size => new(max.X-min.X, max.Y-min.Y, max.Z-min.Z);
    }
    /* */

    /* Mesh Data */
    private sealed class MeshData {
        public List<float> vertices = new();
        public List<uint> indices = new();
        public Vector3 minBounds, maxBounds;
    }

    private static readonly Dictionary<string, MeshData> _data = BuildData();
    private static Dictionary<string, MeshData> Data() => _data;
    private static Dictionary<string, MeshData> BuildData() {
        var m = new Dictionary<string, MeshData>();

        /* Triangle */
        m["triangle"] = new MeshData {
            vertices = new List<float> {
                -0.5f,-0.5f,-0.5f,  0f,-1f,0f,  0f,0f,  0f,0f,0f,
                 0.5f,-0.5f,-0.5f,  0f,-1f,0f,  1f,0f,  0f,0f,0f,
                 0.5f,-0.5f, 0.5f,  0f,-1f,0f,  1f,1f,  0f,0f,0f,
                -0.5f,-0.5f, 0.5f,  0f,-1f,0f,  0f,1f,  0f,0f,0f,

                 0f, 0.5f, 0f,     -0.894f,0.447f,0f,  0.5f,0.5f,  0f,0f,0f,
                 0f, 0.5f, 0f,      0f,0.447f,-0.894f, 0.5f,0.5f,  0f,0f,0f,
                 0f, 0.5f, 0f,      0.894f,0.447f,0f,  0.5f,0.5f,  0f,0f,0f,
                 0f, 0.5f, 0f,      0f,0.447f,0.894f,  0.5f,0.5f,  0f,0f,0f,
            },
            indices = new List<uint> {
                4,0,1, 5,1,2, 6,2,3, 7,3,0,
                0,1,2, 0,2,3
            },
            minBounds = new Vector3(-0.5f,-0.5f,-0.5f),
            maxBounds = new Vector3( 0.5f, 0.5f, 0.5f),
        };
        /* Cube */
        m["cube"] = new MeshData {
            vertices = new List<float> {
                -0.5f,-0.5f, 0.5f,  0,0,1,  0,0,  1,0,0,
                 0.5f,-0.5f, 0.5f,  0,0,1,  1,0,  1,0,0,
                 0.5f, 0.5f, 0.5f,  0,0,1,  1,1,  1,0,0,
                -0.5f, 0.5f, 0.5f,  0,0,1,  0,1,  1,0,0,

                 0.5f,-0.5f,-0.5f,  0,0,-1, 0,0,  0,0,1,
                -0.5f,-0.5f,-0.5f,  0,0,-1, 1,0,  0,0,1,
                -0.5f, 0.5f,-0.5f,  0,0,-1, 1,1,  0,0,1,
                 0.5f, 0.5f,-0.5f,  0,0,-1, 0,1,  0,0,1,

                -0.5f, 0.5f, 0.5f,  0,1,0,  0,0,  0,1,0,
                 0.5f, 0.5f, 0.5f,  0,1,0,  1,0,  0,1,0,
                 0.5f, 0.5f,-0.5f,  0,1,0,  1,1,  0,1,0,
                -0.5f, 0.5f,-0.5f,  0,1,0,  0,1,  0,1,0,

                -0.5f,-0.5f,-0.5f,  0,-1,0, 0,0,  1,1,0,
                 0.5f,-0.5f,-0.5f,  0,-1,0, 1,0,  1,1,0,
                 0.5f,-0.5f, 0.5f,  0,-1,0, 1,1,  1,1,0,
                -0.5f,-0.5f, 0.5f,  0,-1,0, 0,1,  1,1,0,

                 0.5f,-0.5f, 0.5f,  1,0,0,  0,0,  0,1,1,
                 0.5f,-0.5f,-0.5f,  1,0,0,  1,0,  0,1,1,
                 0.5f, 0.5f,-0.5f,  1,0,0,  1,1,  0,1,1,
                 0.5f, 0.5f, 0.5f,  1,0,0,  0,1,  0,1,1,

                -0.5f,-0.5f,-0.5f, -1,0,0,  0,0,  1,0,1,
                -0.5f,-0.5f, 0.5f, -1,0,0,  1,0,  1,0,1,
                -0.5f, 0.5f, 0.5f, -1,0,0,  1,1,  1,0,1,
                -0.5f, 0.5f,-0.5f, -1,0,0,  0,1,  1,0,1,
            },
            indices = new List<uint> {
                0,1,2, 0,2,3,  4,5,6, 4,6,7,
                8,9,10, 8,10,11,  12,13,14, 12,14,15,
                16,17,18, 16,18,19,  20,21,22, 20,22,23
            },
            minBounds = new Vector3(-0.5f,-0.5f,-0.5f),
            maxBounds = new Vector3( 0.5f, 0.5f, 0.5f),
        };
        /* Sphere */
        m["sphere"] = ((Func<MeshData>)(() => {
            const int subdivisions = 4;
            float t = (1f + MathF.Sqrt(5f)) / 2f;

            Func<Vector3, Vector3> norm = v => {
                float l = MathF.Sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z);
                return new Vector3(v.X/l, v.Y/l, v.Z/l);
            };

            var positions = new List<Vector3> {
                norm(new Vector3(-1, t, 0)), norm(new Vector3( 1, t, 0)),
                norm(new Vector3(-1,-t, 0)), norm(new Vector3( 1,-t, 0)),
                norm(new Vector3( 0,-1, t)), norm(new Vector3( 0, 1, t)),
                norm(new Vector3( 0,-1,-t)), norm(new Vector3( 0, 1,-t)),
                norm(new Vector3( t, 0,-1)), norm(new Vector3( t, 0, 1)),
                norm(new Vector3(-t, 0,-1)), norm(new Vector3(-t, 0, 1)),
            };
            var indices = new List<uint> {
                0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11,
                1,5,9,  5,11,4, 11,10,2, 10,7,6, 7,1,8,
                3,9,4,  3,4,2, 3,2,6, 3,6,8, 3,8,9,
                4,9,5,  2,4,11, 6,2,10, 8,6,7, 9,8,1,
            };

            var cache = new Dictionary<(uint, uint), uint>();
            Func<uint, uint, uint> getMidpoint = (i1, i2) => {
                var key = i1 < i2 ? (i1, i2) : (i2, i1);
                if(cache.TryGetValue(key, out var cached)) return cached;

                var a = positions[(int)i1];
                var b = positions[(int)i2];
                var mid = norm(new Vector3(a.X+b.X, a.Y+b.Y, a.Z+b.Z));

                uint idx = (uint)positions.Count;
                positions.Add(mid);
                cache[key] = idx;
                return idx;
            };

            for(int i = 0; i < subdivisions; ++i) {
                var newIndices = new List<uint>(indices.Count* 4);
                for(int j = 0; j < indices.Count; j += 3) {
                    uint v1 = indices[j];
                    uint v2 = indices[j+1];
                    uint v3 = indices[j+2];

                    uint a = getMidpoint(v1, v2);
                    uint b = getMidpoint(v2, v3);
                    uint c = getMidpoint(v3, v1);

                    newIndices.AddRange(new[] {
                        v1, a, c,
                        v2, b, a,
                        v3, c, b,
                        a,  b, c,
                    });
                }
                indices = newIndices;
                cache.Clear();
            }

            var vertices = new List<float>();
            var finalIndices = new List<uint>();

            for(int i = 0; i < indices.Count; i += 3) {
                Vector3 v0 = positions[(int)indices[i]];
                Vector3 v1 = positions[(int)indices[i+1]];
                Vector3 v2 = positions[(int)indices[i+2]];

                float u0 = 0.5f + MathF.Atan2(v0.X, v0.Z) / (2f * MathF.PI);
                float y0 = 0.5f + MathF.Asin(v0.Y) / MathF.PI;
                float u1 = 0.5f + MathF.Atan2(v1.X, v1.Z) / (2f * MathF.PI);
                float y1 = 0.5f + MathF.Asin(v1.Y) / MathF.PI;
                float u2 = 0.5f + MathF.Atan2(v2.X, v2.Z) / (2f * MathF.PI);
                float y2 = 0.5f + MathF.Asin(v2.Y) / MathF.PI;

                var uvs = new[] { u0, u1, u2 };
                for (int a = 0; a < 3; ++a)
                for (int b = a + 1; b < 3; ++b) {
                    if (MathF.Abs(uvs[a] - uvs[b]) > 0.5f) {
                        if (uvs[a] < 0.5f) uvs[a] += 1f;
                        else if (uvs[b] < 0.5f) uvs[b] += 1f;
                    }
                }
                u0 = uvs[0]; u1 = uvs[1]; u2 = uvs[2];

                uint baseIdx = (uint)(vertices.Count / 11);

                Action<Vector3, float, float> pushVertex = (p, u, v) => {
                    vertices.Add(p.X * 0.5f);
                    vertices.Add(p.Y * 0.5f);
                    vertices.Add(p.Z * 0.5f);
                    vertices.Add(p.X);
                    vertices.Add(p.Y);
                    vertices.Add(p.Z);
                    vertices.Add(u);
                    vertices.Add(v);
                    vertices.Add(0.3f);
                    vertices.Add(0.5f);
                    vertices.Add(0.8f);
                };
                pushVertex(v0, u0, y0);
                pushVertex(v1, u1, y1);
                pushVertex(v2, u2, y2);

                finalIndices.Add(baseIdx);
                finalIndices.Add(baseIdx + 1);
                finalIndices.Add(baseIdx + 2);
            }

            return new MeshData {
                vertices = vertices,
                indices = finalIndices,
                minBounds = new Vector3(-0.5f, -0.5f, -0.5f),
                maxBounds = new Vector3( 0.5f,  0.5f,  0.5f),
            };
        }))();
        return m;
    }
    /* */

    private readonly Dictionary<string, BufferData> bufferMeshes = new();
    private readonly Dictionary<uint, Transform> transforms = new();
    private readonly Dictionary<uint, string> idToType = new();
    private readonly Dictionary<uint, uint> textureIds = new();
    private readonly Dictionary<uint, uint> hasLitIds = new();
    private readonly List<InstanceEntry> pendingInstances = new();

    private int instanceSsb = 0;
    private int instanceCapacityBytes = 0;
    private const int InstanceBinding = 0;

    private uint drawCalls = 0;

    private readonly Shader shader;
    private readonly Camera camera;

    public uint GetDrawCalls() => drawCalls;

    public Mesh(Shader shader, Camera camera) {
        this.shader = shader;
        this.camera = camera;
    }

    // Get Type
    public string GetType(uint id) {
        string val = idToType.TryGetValue(id, out var t) ? t : "";
        return val;
    }

    // Get Position
    public Vector3 GetPosition(uint id) {
        Vector3 val = transforms.TryGetValue(id, out var t) ? t.Position : Vector3.Zero;
        return val;
    }

    // Set Position
    public void SetPosition(uint id, float x, float y, float z) {
        transforms[id].Position = new Vector3(x, y, z);
    }

    // Set Rotation
    public void SetRotation(uint id, float x, float y, float z) {
        var t = transforms[id];
        t.Rotation = new Vector3(t.Rotation.X+x, t.Rotation.Y+y, t.Rotation.Z+z);
    }

    // Set Scale
    public void SetScale(uint id, float x, float y, float z) {
        transforms[id].Scale = new Vector3(x, y, z);
    }

    // Set Color
    public void SetColor(uint id, float r, float g, float b) {
        transforms[id].Color = new Vector3(r, g, b);
    }

    // Get Texture
    public uint GetTexture(uint id) {
        uint val = textureIds.TryGetValue(id, out var v) ? v : 0u;
        return val;
    }

    // Set Texture
    public void SetTexture(uint id, uint texId) {
        textureIds[id] = texId;
    }

    // Set Has Lit
    public void SetHasLit(uint id, bool lit) {
        hasLitIds[id] = lit ? 1u : 0u;
    }

    // Get Bounds
    public Bounds GetBounds(string type) {
        if(bufferMeshes.TryGetValue(type, out var b)) return new Bounds { min = b.minBounds, max = b.maxBounds };
        if(Data().TryGetValue(type, out var d)) return new Bounds       { min = d.minBounds, max = d.maxBounds };
        throw new Exception($"Mesh.GetBounds: unknown type {type}");
    }

    /**
     * Upload Mesh
     */
    private void UploadMesh(string type, MeshData data) {
        int vao = GL.GenVertexArray();
        GL.BindVertexArray(vao);

        int vbo = GL.GenBuffer();
        GL.BindBuffer(BufferTarget.ArrayBuffer, vbo);
        GL.BufferData(BufferTarget.ArrayBuffer,
                    data.vertices.Count * sizeof(float),
                    data.vertices.ToArray(),
                    BufferUsageHint.StaticDraw);

        int ibo = GL.GenBuffer();
        GL.BindBuffer(BufferTarget.ElementArrayBuffer, ibo);
        GL.BufferData(BufferTarget.ElementArrayBuffer,
                    data.indices.Count * sizeof(uint),
                    data.indices.ToArray(),
                    BufferUsageHint.StaticDraw);

        GL.VertexAttribPointer(0, 3, VertexAttribPointerType.Float, false, Vertex.Stride, 0);
        GL.EnableVertexAttribArray(0);
        GL.VertexAttribPointer(1, 3, VertexAttribPointerType.Float, false, Vertex.Stride, 3*sizeof(float));
        GL.EnableVertexAttribArray(1);
        GL.VertexAttribPointer(2, 2, VertexAttribPointerType.Float, false, Vertex.Stride, 6*sizeof(float));
        GL.EnableVertexAttribArray(2);
        GL.VertexAttribPointer(3, 3, VertexAttribPointerType.Float, false, Vertex.Stride, 8*sizeof(float));
        GL.EnableVertexAttribArray(3);

        GL.BindVertexArray(0);
        
        GL.BindVertexArray(0);

        bufferMeshes[type] = new BufferData {
            vao = vao, vbo = vbo, ibo = ibo,
            indexCount = data.indices.Count,
            minBounds = data.minBounds,
            maxBounds = data.maxBounds
        };
    }

    // Begin Frame
    public void BeginFrame() {
        drawCalls = 0;

        int idx = GL.GetUniformBlockIndex(shader.Program, "InstanceBuffer");
        if(idx >= 0) GL.UniformBlockBinding(shader.Program, idx, InstanceBinding);

        int needed = pendingInstances.Count * DataInstance.Stride;
        if(needed > instanceCapacityBytes) {
            if(instanceSsb != 0) GL.DeleteBuffer(instanceSsb);
            instanceSsb = GL.GenBuffer();
            int capacity = Math.Max(needed, DataInstance.Stride * 64);
            GL.BindBuffer(BufferTarget.ShaderStorageBuffer, instanceSsb);
            GL.BufferData(BufferTarget.ShaderStorageBuffer, capacity, IntPtr.Zero, BufferUsageHint.DynamicDraw);
            GL.BindBufferBase(BufferRangeTarget.ShaderStorageBuffer, InstanceBinding, instanceSsb);
            instanceCapacityBytes = capacity;
        }
    }

    /**
     * Load
     */
    public void Load(uint id, string type) {
        if(!bufferMeshes.ContainsKey(type)) {
            if(!Data().TryGetValue(type, out var src)) throw new Exception($"Unknown mesh type: {type}");
            UploadMesh(type, src);
        }
        transforms.TryAdd(id, new Transform());
        idToType[id] = type;

        if(!pendingInstances.Exists(e => e.id == id)) {
            pendingInstances.Add(new InstanceEntry { id = id, type = type });
        }
    }

    /**
     * Render
     */
    public void Render() {
        if(pendingInstances.Count == 0) return;

        shader.Use();
        shader.SetMat4("view",      camera.GetViewMatrix());
        shader.SetMat4("proj",      camera.GetProjectionMatrix());
        shader.SetVec3("cameraPos", camera.GetPosition());

        var byType = new Dictionary<string, List<DataInstance>>();
        foreach(var e in pendingInstances) {
            if(!transforms.TryGetValue(e.id, out var t)) continue;
            if(!byType.TryGetValue(e.type, out var list)) byType[e.type] = list = new List<DataInstance>();

            list.Add(new DataInstance {
                model = t.GetModelMatrix(),
                texId = textureIds.TryGetValue(e.id, out var tex) ? tex : 0u,
                hasTexture = textureIds.ContainsKey(e.id) ? 1u : 0u,
                hasLit = hasLitIds.TryGetValue(e.id, out var lit) ? lit : 0u,
                color = t.Color
            });
        }

        var all = new List<DataInstance>();
        foreach(var t in byType) all.AddRange(t.Value);

        GL.BindBuffer(BufferTarget.ShaderStorageBuffer, instanceSsb);
        GL.BufferSubData(BufferTarget.ShaderStorageBuffer, IntPtr.Zero, all.Count * DataInstance.Stride, all.ToArray());
        GL.BindBufferBase(BufferRangeTarget.ShaderStorageBuffer, InstanceBinding, instanceSsb);
        GL.MemoryBarrier(MemoryBarrierFlags.ShaderStorageBarrierBit);

        int offset = 0;
        foreach(var (type, instances) in byType) {
            var d = bufferMeshes[type];
            GL.BindVertexArray(d.vao);

            shader.SetInt("Instance", offset);

            GL.DrawElementsInstanced(
                PrimitiveType.Triangles,
                d.indexCount,
                DrawElementsType.UnsignedInt,
                IntPtr.Zero,
                instances.Count);
            offset += instances.Count;
            drawCalls++;
        }

        GL.BindVertexArray(0);
    }

    // Cleanup
    public void Cleanup() {
        if(instanceSsb != 0) {
            GL.DeleteBuffer(instanceSsb);
            instanceSsb = 0;
            instanceCapacityBytes = 0;
        }
        foreach(var b in bufferMeshes.Values) b.Dispose();
        bufferMeshes.Clear();
        transforms.Clear();
        idToType.Clear();
        textureIds.Clear();
        hasLitIds.Clear();
        pendingInstances.Clear();
    }

    // Clear Instances
    public void ClearInstances(IEnumerable<uint> ids) {
        var set = new HashSet<uint>(ids);
        foreach(var id in set) {
            transforms.Remove(id);
            idToType.Remove(id);
            hasLitIds.Remove(id);
            textureIds.Remove(id);
        }
        pendingInstances.RemoveAll(e => set.Contains(e.id));
    }
}