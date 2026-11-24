namespace App;
using OpenTK.Graphics.OpenGL4;

public class Main {
    readonly private Window window;

    public Main() {
        this.window = new Window();
    }

    ///
    /// Render
    /// 
    private void Render() {
        GL.ClearColor(0.39f, 0.58f, 0.93f, 1.0f);
        GL.Clear(ClearBufferMask.ColorBufferBit);
        GL.Viewport(0, 0, Window.WINDOW_WIDTH, Window.WINDOW_HEIGHT);
        window.SwapBuffers();
    }

    ///
    /// Run
    /// 
    public void Run() {
        while(window.IsRunning) {
            window.Run();
            Render();
        }
    }
}