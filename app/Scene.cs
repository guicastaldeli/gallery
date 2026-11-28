namespace App;

using App.Util;

public class Scene {
    private const int TERRAIN_COLS = 10;
    private const int TERRAIN_ROWS = 10;

    private const string MESH_TYPE = "cube";

    private const float POS_X = 0.0f;
    private const float POS_Y = 0.0f;
    private const float POS_Z = 0.0f;

    private readonly Mesh mesh;
    private readonly CollisionManager collisionManager;
    
    private bool loaded = false;

    public Scene(Mesh mesh, CollisionManager collisionManager) {
        this.mesh = mesh;
        this.collisionManager = collisionManager;
    }

    /**
     * Set
     */
    private void Set() {
        var bounds = mesh.GetBounds(MESH_TYPE);
        float cx = bounds.size.X;
        float cz = bounds.size.Z;

        for(int x = 0; x < TERRAIN_COLS; x++) {
            for(int z = 0; z < TERRAIN_ROWS; z++) {
                uint id = Id.Next();
                mesh.Load(id, MESH_TYPE);

                float v = 2.0f;
                float px = (x - TERRAIN_COLS / v) * cx;
                float pz = (z - TERRAIN_ROWS / v) * cz;
                mesh.SetPosition(id, px, POS_Y, pz);

                collisionManager.Set(id, CollisionType.STATIC_COLLIDER);
            }
        }
    }

    /**
     * Update
     */
    public void Update() {
        if(!loaded) return;
        //mesh.SetRotation(id, 0.0f, 0.0001f, 0.0f);
    }

    /**
     * Render
     */
    public void Render() {
        if(!loaded) {
            Set();    
            loaded = true;
        }
    }
}