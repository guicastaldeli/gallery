namespace App;

using OpenTK.Graphics.OpenGL4;
using OpenTK.Mathematics;
using OpenTK.Windowing.Common;
using OpenTK.Windowing.Desktop;

public class Window : NativeWindow {
    readonly public static int WINDOW_WIDTH = 784;
    readonly public static int WINDOW_HEIGHT = 440;
    readonly private static string WINDOW_TITLE = "Gallery";

    public Window() : base(new NativeWindowSettings() {
        ClientSize = new Vector2i(WINDOW_WIDTH, WINDOW_HEIGHT),
        Title =      WINDOW_TITLE,
        API =        ContextAPI.OpenGL
    }) {
        Context.MakeCurrent();
    }

    ///
    /// Run
    /// 
    public void Run() {
        Thread thread = new Thread(() => {
            Context.MakeCurrent();
            while(!IsExiting) {
                Context.SwapBuffers();
            }
        });

        Context.MakeNoneCurrent();
        thread.Start();
        thread.Join();
    }
}