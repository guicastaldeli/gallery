namespace App;
using OpenTK.Graphics.OpenGL4;

public class Main {
    private readonly Window window;
    private readonly Shader shader;
    private readonly Tick tick;
    private readonly Input input;
    private readonly Camera camera;
    private readonly Mesh mesh;
    private readonly CollisionManager collisionManager;
    private readonly Scene scene;

    public Main() {
        this.window = new Window();
        this.shader = new Shader();
        this.tick = new Tick();
        this.input = new Input(window);
        this.camera = new Camera(tick, input);
        this.mesh = new Mesh(shader, camera);
        this.collisionManager = new CollisionManager(tick, mesh);
        this.scene = new Scene(mesh, collisionManager);
    }

    /**
     * Update
     */
    private void Update() {
        tick.Update();
        camera.Update();
        collisionManager.Update();
        input.Update();
        scene.Update();
    }

    /**
     * Render
     */
    private void Render() {
        GL.ClearColor(0.5f, 0.5f, 0.5f, 1.0f);
        GL.Clear(ClearBufferMask.ColorBufferBit | ClearBufferMask.DepthBufferBit);
        GL.Viewport(0, 0, Window.WINDOW_WIDTH, Window.WINDOW_HEIGHT);

        scene.Render();
        
        mesh.BeginFrame();
        mesh.Render();

        window.SwapBuffers();
    }

    /**
     * Init
     */ 
    public void Init() {
        shader.Init();
        camera.Init(collisionManager);
        
        while(window.IsRunning) {
            window.Init();
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