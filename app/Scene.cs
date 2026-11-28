namespace App;

public class Scene {
    private readonly Mesh mesh;
    private uint id = 1;
    private bool loaded = false;

    public Scene(Mesh mesh) {
        this.mesh = mesh;
    }

    /**
     * Update
     */
    public void Update() {
        if(!loaded) return;
        mesh.SetRotation(id, 0.0f, 0.0001f, 0.0f);
    }

    /**
     * Render
     */
    public void Render() {
        if(!loaded) {
            mesh.Load(id, "cube");
            mesh.SetPosition(id, 0.0f, 0.0f, -3.0f);
            
            loaded = true;
        }
    }
}