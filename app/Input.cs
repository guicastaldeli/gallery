namespace App;

using OpenTK.Windowing.Common;
using OpenTK.Windowing.GraphicsLibraryFramework;

public class Input {
    private readonly Window window;

    public Input(Window window) {
        this.window = window;
    }

    /*******************
     * Keyboard
     ******/
    private readonly HashSet<Keys> m_keysDown = new();
    private readonly HashSet<Keys> m_keysPressed = new();
    private readonly HashSet<Keys> m_keysReleased = new();

    private bool m_cursorCaptured = false;
    
    /**
     * Key Down
     */
    public bool KeyDown(Keys k) {
        bool v = m_keysDown.Contains(k);
        return v;
    }

    /**
     * Key Pressed
     */
    public bool KeyPressed(Keys k) {
        bool v = m_keysPressed.Contains(k);
        return v;
    }

    /**
     * Key Released
     */
    public bool KeyReleased(Keys k) {
        bool v = m_keysReleased.Contains(k);
        return v;
    }

    /**
     * On Key
     */
    public void OnKey(Keys key, bool isDown) {
        if(isDown) {
            m_keysDown.Add(key);
            m_keysPressed.Add(key);
        } else {
            m_keysDown.Remove(key);
            m_keysReleased.Add(key);
        }
    }
    /* */

    /****************
     * Mouse
     *******/
    private readonly HashSet<MouseButton> m_mouseDown = new();
    private readonly HashSet<MouseButton> m_mousePressed = new();
    private readonly HashSet<MouseButton> m_mouseReleased = new();
    
    private double m_mouseX  = 0.0, m_mouseY  = 0.0;
    private double m_mouseDX = 0.0, m_mouseDY = 0.0;
    private double m_rawDX   = 0.0, m_rawDY   = 0.0;

    private bool m_firstMouseSample = true;

    public double MouseX()          => m_mouseX;
    public double MouseY()          => m_mouseY;
    public double MouseDeltaX()     => m_mouseDX;
    public double MouseDeltaY()     => m_mouseDY;
    public bool IsCursorCaptured()  => m_cursorCaptured;

    /**
     * Mouse Down
     */
    public bool MouseDown(MouseButton b) {
        bool v = m_mouseDown.Contains(b);
        return v;
    }

    /**
     * Mouse Pressed
     */
    public bool MousePressed(MouseButton b) {
        bool v = m_mousePressed.Contains(b);
        return v;
    }

    /**
     * Mouse Released
     */
    public bool MouseReleased(MouseButton b) {
        bool v = m_mouseReleased.Contains(b);
        return v;
    }

    /**
     * On Mouse Button
     */
    public void OnMouseButton(MouseButton b, bool isDown) {
        if(isDown) {
            m_mouseDown.Add(b);
            m_mousePressed.Add(b);
        } else {
            m_mouseDown.Remove(b);
            m_mouseReleased.Add(b);
        }
    }

    /**
     * On Cursor Pos
     */
    public void OnCursorPos(double x, double y) {
        if(m_firstMouseSample) {
            m_mouseX = x; m_mouseY = y;
            m_firstMouseSample = false;
            return;        
        }
        m_rawDX += x - m_mouseX;
        m_rawDY += y - m_mouseY;
        m_mouseX = x;
        m_mouseY = y;
    }

    /**
     * Set Cursor Captured
     */
    public void SetCursorCaptured(bool captured) {
        if(m_cursorCaptured == captured) return;
        m_cursorCaptured = captured;
        window.CursorState = captured ? CursorState.Grabbed : CursorState.Normal;
        if(captured) m_firstMouseSample = true;
    }
    /* */

    /**
     * Update
     */
    public void Update() {
        if(m_cursorCaptured) {
            if(KeyPressed(Keys.Escape)) {
                SetCursorCaptured(false);
            }
        } else {
            if(KeyPressed(Keys.Escape) || MousePressed(MouseButton.Left)) {
                SetCursorCaptured(true);
            }
        }
    }
}