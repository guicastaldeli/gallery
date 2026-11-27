namespace App;
using OpenTK.Graphics.OpenGL4;

public class Main {
    private readonly Window window;
    private readonly Shader shader;
    private readonly Tick tick;
    private readonly Input input;
    private readonly Camera camera;
    private readonly Mesh mesh;
    private readonly Scene scene;

    public Main() {
        this.window = new Window();
        this.shader = new Shader();
        this.tick = new Tick();
        this.input = new Input(window);
        this.camera = new Camera(tick, input);
        this.mesh = new Mesh(shader, camera);
        this.scene = new Scene(mesh);
    }

    /**
     * Update
     */
    private void Update() {
        tick.Update();
        input.Update();
        camera.Update();
    }

    /**
     * Render
     */
    private void Render() {
        GL.ClearColor(0.39f, 0.58f, 0.93f, 1.0f);
        GL.Clear(ClearBufferMask.ColorBufferBit | ClearBufferMask.DepthBufferBit);
        GL.Viewport(0, 0, Window.WINDOW_WIDTH, Window.WINDOW_HEIGHT);

        mesh.BeginFrame();
        mesh.Render();

        

        window.SwapBuffers();
    }

    /**
     * Run
     */ 
    public void Run() {
        shader.Run();
        input.SetCursorCaptured(true);

        scene.Render();
        
        while(window.IsRunning) {
            window.Run();
            Update();
            Render();
        }

        Cleanup();
    }

    // Cleanup
    private void Cleanup() {
        mesh.Cleanup();
        shader.Cleanup();
    }
}