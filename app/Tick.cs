namespace App;

using System.Diagnostics;

public class Tick {
    private const int TICKS_PER_SECOND = 20;
    private const float MS_PER_TICK = 1000.0f / TICKS_PER_SECOND;

    private readonly Stopwatch clock = Stopwatch.StartNew();
    private long lastTicks;

    private float accumulator = 0.0f;
    private float deltaMs = 0.0f;
    private float deltaTime = 0.0f;
    private float elapsedTime = 0.0f;
    private ulong tickCount = 0;
    private bool ticked = false;

    public Tick() {
        lastTicks = clock.ElapsedTicks;
    }

    // Should Tick
    public bool ShouldTick() {
        bool v = ticked;
        return v;
    }

    // Get Tick Count
    public ulong GetTickCount() {
        ulong v = tickCount;
        return v;
    }

    // Get Tick Rate
    public float GetTickRate() {
        float v = TICKS_PER_SECOND;
        return v;
    }

    /**
     * Get Delta Time
     */
    public float GetDeltaTime() {
        float v = deltaTime;
        return v;
    }

    /**
     * Get Elapsed Time
     */
    public float GetElapsedTime() {
        float v = elapsedTime;
        return v;
    }

    /**
     * Update
     */
    public void Update() {
        long now = clock.ElapsedTicks;
        long elapsedTicks = now - lastTicks;
        lastTicks = now;

        double ms = elapsedTicks * 1000.0 / Stopwatch.Frequency;
        deltaMs = (float)Math.Min(ms, 100.0);
        deltaTime = deltaMs * 0.001f;

        elapsedTime += deltaTime;
        accumulator += deltaMs;

        ticked = false;
        if(accumulator >= MS_PER_TICK) {
            tickCount++;
            ticked = true;
            accumulator -= MS_PER_TICK;
        }
    }
}