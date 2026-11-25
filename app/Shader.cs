namespace App;

using OpenTK.Graphics.OpenGL4;
using OpenTK.Mathematics;

/// ------------------------------
/// ShaderStage
/// ------------------------------
public struct ShaderStage {
    public ShaderType   stage;
    public string       path;
    public string       entry;

    public ShaderStage(
           ShaderType   stage, 
           string       path, 
           string       entry = "main") {
        this.stage      = stage;
        this.path       = path;
        this.entry      = entry;
    }
}

/// ------------------------------
/// Shader
/// ------------------------------
public class Shader {
    /* Sources */
    private static readonly ShaderStage[] Src = {
        new() { stage = ShaderType.VertexShader,    path = "vert.glsl" },
        new() { stage = ShaderType.FragmentShader,  path = "frag.glsl" }
    };
    /* */

    private readonly List<int> modules = new();
    private readonly Dictionary<string, int> uniformCache = new();
    public int Program { get; private set; } = 0;

    // Set Mat4
    public void SetMat4(string name, Matrix4 m) {
        int loc = Loc(name);
        if(loc < 0) return;
        GL.UniformMatrix4(loc, true, ref m);
    }

    // Set Vec3
    public void SetVec3(string name, Vector3 v) {
        int loc = Loc(name);
        if(loc < 0) return;
        GL.Uniform3(loc, v.X, v.Y, v.Z);
    }

    // Set Vec2
    public void SetVec2(string name, Vector2 v) {
        int loc = Loc(name);
        if(loc < 0) return;
        GL.Uniform2(loc, v.X, v.Y);
    }

    // Set Float
    public void SetFloat(string name, float v) {
        int loc = Loc(name);
        if(loc < 0) return;
        GL.Uniform1(loc, v);
    }

    // Set Int
    public void SetInt(string name, int v) {
        int loc = Loc(name);
        if(loc < 0) return;
        GL.Uniform1(loc, v);
    }

    // Set Bool
    public void SetBool(string name, bool v) {
        int loc = Loc(name);
        if(loc < 0) return;
        GL.Uniform1(loc, v ? 1 : 0);
    }

    // Read File
    public static string ReadFile(string filename) {
        if(!File.Exists(filename)) throw new Exception($"failed to open shader file: {filename}");
        return File.ReadAllText(filename);
    }

    // Compile
    public int Compile(int shaderType, string source) {
        int shader = GL.CreateShader((ShaderType)shaderType);
        GL.ShaderSource(shader, source);
        GL.CompileShader(shader);
        GL.GetShader(shader, ShaderParameter.CompileStatus, out int ok);
        if(ok == 0) {
            string log = GL.GetShaderInfoLog(shader);
            GL.DeleteShader(shader);
            throw new Exception($"shader compile failed ({shaderType}):\n{log}");
        }
        return shader;
    }

    // Loc
    private int Loc(string name) {
        if(!uniformCache.TryGetValue(name, out int loc)) {
            loc = GL.GetUniformLocation(Program, name);
            uniformCache[name] = loc;
        }
        return loc;
    }

    /**
     * Use
     */
    public void Use() {
        GL.UseProgram(Program);
    }

    /**
     * Run
     */
    public void Run() {
        modules.Clear();
        uniformCache.Clear();

        foreach(var s in Src) {
            string code = ReadFile(s.path);
            Console.WriteLine($"[shader] {s.path}  size={code.Length} chars");

            int mod = Compile((int)s.stage, code);
            modules.Add(mod);
        }

        Program = GL.CreateProgram();
        foreach(int m in modules) GL.AttachShader(Program, m);
        GL.LinkProgram(Program);
        GL.GetProgram(Program, GetProgramParameterName.LinkStatus, out int linked);
        if(linked == 0) {
            string log = GL.GetProgramInfoLog(Program);
            throw new Exception($"program link failed:\n{log}");
        }

        foreach(int m in modules) {
            GL.DetachShader(Program, m);
            GL.DeleteShader(m);
        }
        modules.Clear();
    }

    // Cleanup
    public void Cleanup() {
        foreach(int m in modules) GL.DeleteShader(m);
        modules.Clear();
        uniformCache.Clear();
        if(Program != 0) {
            GL.DeleteProgram(Program);
            Program = 0;
        }
    }
}

