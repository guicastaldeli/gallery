namespace App;

using OpenTK.Mathematics;
using OpenTK.Windowing.GraphicsLibraryFramework;

/// ------------------------------
/// RigidBody
/// ------------------------------
public class RigidBody {
    public Vector3 position = new(0, 0, 0);
    public Vector3 velocity = new(0, 0, 0);
    public Vector3 size     = new(1, 1, 1);
    private bool paused     = false;

    public Camera camera = null!;
    public Tick tick = null!;

    public float GRAVITY = 0.0f;
    public float JUMP_SPEED = 9.0f;

    public float verticalVel = 0.0f;

    public bool grounded = false;
    public bool isJumping = false;
    public bool wantsJump = false;

    // Pause
    public void Pause() {
        paused = true;
        velocity = Vector3.Zero;
    }

    // Is Paused
    public bool IsPaused() {
        bool v = paused;
        return v;
    }

    // Resume
    public void Resume() {
        paused = false;
    }

    // Toggle
    public void Toggle() {
        if(paused) Resume();
        else Pause();
    }

    // Get Position
    public Vector3 GetPosition() {
        Vector3 v = position;
        return v;
    }

    // Set Position
    public void SetPosition(Vector3 p) {
        position = p;
    }

    // Get Velocity
    public Vector3 GetVelocity() {
        Vector3 v = velocity;
        return v;
    }

    // Set Velocity
    public void SetVelocity(Vector3 v) {
        velocity = v;
    }

    // Get Size
    public Vector3 GetSize() {
        Vector3 v = size;
        return v;
    }

    // Set Size
    public void SetSize(Vector3 s) {
        size = s;
    }

    // Is Grounded
    public bool IsGrounded() {
        bool v = grounded;
        return v;
    }

    // Set Grounded
    public void SetGrounded(bool g) {
        grounded = g;
    }

    // Set Gravity
    public void SetGravity() {
        const float MAX_FALL_SPEED = 50.0f;
        if(!grounded) {
            verticalVel -= GRAVITY * tick.GetDeltaTime();
            if(verticalVel < -MAX_FALL_SPEED) verticalVel = -MAX_FALL_SPEED;
        } else {
            if(verticalVel < 0.0f) verticalVel = 0.0f;
        }
    }

    /**
     * Move
     */
    public void Move(Vector3 m, float moveSpeed, bool flyMode = false) {
        if(paused) return;

        Vector3 vel = velocity;

        const float v = 1e-6f;
        float len = MathF.Sqrt(m.X*m.X + m.Z*m.Z);
        if(len > v) {
            m.X /= len; m.Z /= len;
            vel.X = m.X * moveSpeed;
            vel.Z = m.Z * moveSpeed;
        } else {
            vel.X = 0.0f;
            vel.Z = 0.0f;
        }
        if(flyMode) {
            vel.Y = m.Y * moveSpeed;
        }

        SetVelocity(vel);
    }

    /**
     * Jump
     */
    public void Jump(bool g) {
        if(isJumping && g) {
            if(verticalVel <= 0.0f) {
                isJumping = false;
                grounded = true;
                wantsJump = false;
            }
            return;
        }
    }

    /**
     * Update
     */
    public void Update() {
        if(paused || tick == null) return;
        float dt = tick.GetDeltaTime();
        position += velocity * dt;
    }

    /**
     * Init
     */
    public void Init() {
        tick = camera.GetTick();
        size = camera.rigidBodySize;
        position = new Vector3(camera.POS_X, camera.POS_Y, camera.POS_Z);
    }
}

/// ------------------------------
/// RigidBody
/// ------------------------------
public class Camera {
    public float zNear = 0.1f;
    public float zFar = 1000.0f;
    public float fov = 160.0f;

    public float POS_X = 0.0f;
    public float POS_Y = 0.0f;
    public float POS_Z = 0.0f;

    public float MOVE_SPEED = 5.0f;
    public float MOUSE_SENSV = 50.0f;
    private const float SENSV_SCALE = 0.0001f;
    private float MOUSE_SENSV_VAL => MOUSE_SENSV * SENSV_SCALE;

    private readonly Tick tick;
    private readonly Input input;

    private readonly RigidBody rigidBody = new();
    public Vector3 rigidBodySize = new(1.0f, 3.0f, 1.0f);

    private Vector3 position;
    private float yaw = 0.0f;
    private float pitch = 0.0f;

    private Vector3 forward;
    private Vector3 right;
    private Vector3 up;

    private bool paused = false;

    public bool flyMode = false;

    public float AspectRatio = (float)Window.WINDOW_WIDTH / Window.WINDOW_HEIGHT;

    public Camera(Tick tick, Input input) {
        this.tick = tick;
        this.input = input;
        
        rigidBody.camera = this;
        rigidBody.Init();

        Set();
    }

    // Get Tick
    public Tick GetTick() {
        Tick v = tick;
        return v;
    }

    // Get RigidBody
    public RigidBody GetRigidBody() {
        RigidBody v = rigidBody;
        return v;
    }

    // Pause
    public void Pause() {
        paused = true;
    }

    // Is Paused
    public bool IsPaused() {
        return paused;
    }

    // Resume
    public void Resume() {
        paused = false;
    }

    // Toggle
    public void Toggle() {
        paused = !paused;
    }

    // Set Position
    public void SetPosition() {
        position = new Vector3(POS_X, POS_Y, POS_Z);
        Set();
        SetYawPitch();
    }

    // Get Position
    public Vector3 GetPosition() {
        Vector3 v = rigidBody.GetPosition();
        return v;
    }

    // Get Forward
    public Vector3 GetForward() {
        Vector3 v = forward;
        return v;
    }

    // Get Right
    public Vector3 GetRight() {
        Vector3 v = right;
        return v;
    }

    // Get Up
    public Vector3 GetUp() {
        Vector3 v = up;
        return v;
    }

    // Set Yaw Pitch
    public void SetYawPitch() {
        const float limit = 1.55334f;
        if(pitch > limit)  pitch = limit;
        if(pitch < -limit) pitch = -limit;
        Set();
    }

    // Get View Matrix
    public Matrix4 GetViewMatrix() {
        Vector3 p = GetPosition();
        Matrix4 v = Matrix4.LookAt(p, p + forward, up);
        return v;
    }

    // Get Projection Matrix
    public Matrix4 GetProjectionMatrix() {
        return Matrix4.CreatePerspectiveFieldOfView(
            fov,
            AspectRatio,
            zNear, zFar
        );
    }

    // Toggle Fly Mode
    public void ToggleFlyMode() {
        flyMode = !flyMode;
        Vector3 v = rigidBody.GetVelocity();
        v.Y = 0.0f;
        rigidBody.SetVelocity(v);
        rigidBody.verticalVel = 0.0f;
        rigidBody.grounded = false;

        Console.WriteLine($"Fly Mode: {flyMode}");
    }

    // Jump
    public void Jump() {
        if(input.KeyPressed(Keys.Space)) rigidBody.wantsJump = true;
        if(rigidBody.grounded && !rigidBody.isJumping && rigidBody.wantsJump) {
            rigidBody.verticalVel = rigidBody.JUMP_SPEED;
            rigidBody.grounded = false;
            rigidBody.isJumping = true;
        }
    }

    /**
     * Set
     */
    public void Set() {
        forward.X = -MathF.Sin(yaw) * MathF.Cos(pitch);
        forward.Y = MathF.Sin(pitch);
        forward.Z = -MathF.Cos(yaw) * MathF.Cos(pitch);
        forward = Vector3.Normalize(forward);

        right = Vector3.Normalize(Vector3.Cross(forward, Vector3.UnitY));
        up = Vector3.Normalize(Vector3.Cross(right, forward));
    }

    /**
     * Move
     */
    // Set Move
    public void SetMove() {
        if(!flyMode) {
            Jump();
            rigidBody.SetGravity();
        } else {
            rigidBody.verticalVel = 0.0f;
            rigidBody.grounded = false;
        }
    }

    // Move
    public void Move() {
        Vector3 m = new(0.0f, 0.0f, 0.0f);
        Vector3 fwd = new(forward.X, 0.0f, forward.Z);

        const float v = 1e-6f;
        float fl = MathF.Sqrt(fwd.X*fwd.X + fwd.Z*fwd.Z);
        if(fl > v) { fwd.X /= fl; fwd.Z /= fl; }

        float f = 1.0f;
        if(input.KeyDown(Keys.W))               m += fwd;
        if(input.KeyDown(Keys.S))               m -= fwd;
        if(input.KeyDown(Keys.D))               m += right;
        if(input.KeyDown(Keys.A))               m -= right;
        if(input.KeyDown(Keys.F))               ToggleFlyMode();
        if(flyMode) {
            if(input.KeyDown(Keys.Space))       m.Y += f;
            if(input.KeyDown(Keys.LeftShift))   m.Y -= f;
        } else {
            Vector3 vel = rigidBody.GetVelocity();
            vel.Y = rigidBody.verticalVel;
            rigidBody.SetVelocity(vel);
        }
        
        rigidBody.Move(m, MOVE_SPEED, flyMode);
    }

    /**
     * Update
     */
    public void Update() {
        if(paused) {
            rigidBody.Pause();
            Set();
            return;
        }
        rigidBody.Resume();

        if(input.IsCursorCaptured()) {
            yaw     -= (float)input.MouseDeltaX() * MOUSE_SENSV_VAL;
            pitch   -= (float)input.MouseDeltaY() * MOUSE_SENSV_VAL;

            const float limit = 1.55334f;
            if(pitch > limit) pitch = limit;
            if(pitch < -limit) pitch = -limit;
        }

        Set();
        SetMove();
        Move();
        rigidBody.Update();
    }  

    /**
     * Init
     */ 
    public void Init() {
        input.SetCursorCaptured(true);
        Set();
        SetPosition();
        rigidBody.Update();
    }
}