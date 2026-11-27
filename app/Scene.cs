namespace App;

public class Scene {
    private readonly Mesh mesh;

    public Scene(Mesh mesh) {
        this.mesh = mesh;
    }

    /**
     * Render
     */
    public void Render() {
        uint id = 1;
        mesh.Load(id, "cube");
        mesh.SetPosition(id, 0.0f, 0.0f, -3.0f);
    }
}