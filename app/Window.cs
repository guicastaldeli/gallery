namespace App;

using OpenTK.Graphics.OpenGL4;
using OpenTK.Mathematics;
using OpenTK.Windowing.Common;
using OpenTK.Windowing.Desktop;

public class Window : NativeWindow {
    readonly public static int WINDOW_WIDTH = 784;
    readonly public static int WINDOW_HEIGHT = 440;
    readonly private static string WINDOW_TITLE = "Gallery";

    public bool IsRunning => !IsExiting;
    public void SwapBuffers() => Context.SwapBuffers();
    
    public Window() : base(new NativeWindowSettings() {
        ClientSize = new Vector2i(WINDOW_WIDTH, WINDOW_HEIGHT),
        Title =      WINDOW_TITLE,
        API =        ContextAPI.OpenGL,
        APIVersion = new Version(4, 3),
        Profile =    ContextProfile.Core,
        Vsync =      VSyncMode.Off
    }) {
        Context.MakeCurrent();
    }

    /**
     * Run
     */
    public void Run() {
        float v = 0.0f;
        ProcessEvents(v);
    }
}