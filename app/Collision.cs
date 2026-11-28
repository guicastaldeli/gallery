namespace App;

using OpenTK.Mathematics;

/// ------------------------------
/// BBox
/// ------------------------------
public class BBox {
    public float MinX, MinY, MinZ;
    public float MaxX, MaxY, MaxZ;

    public float SizeX => MaxX - MinX;
    public float SizeY => MaxY - MinY;
    public float SizeZ => MaxZ - MinZ;
    public Vector3 Size => new(MaxX - MinX, MaxY - MinY, MaxZ - MinZ);

    public Vector3 Center => new((MinX + MaxX) * 0.5f,
                                (MinY + MaxY) * 0.5f,
                                (MinZ + MaxZ) * 0.5f);

    public BBox() {}
    public BBox(float MinX, float MinY, float MinZ,
                float MaxX, float MaxY, float MaxZ) {
        this.MinX = MinX; this.MinY = MinY; this.MinZ = MinZ;
        this.MaxX = MaxX; this.MaxY = MaxY; this.MaxZ = MaxZ;
    }

    /**
     * Set From Center
     */
    public void SetFromCenter(Vector3 c, Vector3 size) {
        float hx = size.X * 0.5f, hy = size.Y * 0.5f, hz = size.Z * 0.5f;
        MinX = c.X - hx; MaxX = c.X + hx;
        MinY = c.Y - hy; MaxY = c.Y + hy;
        MinZ = c.Z - hz; MaxZ = c.Z + hz;
    }

    /**
     * From Center
     */
    public static BBox FromCenter(Vector3 c, Vector3 s) {
        var b = new BBox();
        b.SetFromCenter(c, s);
        return b;
    }

    /**
     * Intersects
     */
    public bool Intersects(BBox o) {
        return MinX <= o.MaxX && MaxX >= o.MinX &&
                MinY <= o.MaxY && MaxY >= o.MinY &&
                MinZ <= o.MaxZ && MaxZ >= o.MinZ;
    }
}
//

/// ------------------------------
/// Collision Type
/// ------------------------------
public enum CollisionType {
    STATIC_COLLIDER,
    BOUNDARY_COLLIDER
}
//

/// ------------------------------
/// Collider
/// ------------------------------
public abstract class Collider {
    protected bool visible = true;

    public abstract BBox GetBBox();
    public abstract string GetId();
    public virtual new string GetType() => "";

    public virtual void OnCollision(CollisionResult result) {}
    public virtual void SetVisible(bool v) => visible = v;
    public virtual bool IsVirtual() => visible;

    public virtual RigidBody? GetRigidBody() => null;

    public virtual void ClearInstances() {}
    public virtual void Build() {}
}
//

/***************************
 * Static Collider
 *******************/
public class StaticCollider : Collider {
    public struct Instance {
        public uint Id;
        public Vector3 Position;
    }

    public struct CellKey : IEquatable<CellKey> {
        public int X, Y, Z;
        public bool Equals(CellKey o) => X == o.X && Y == o.Y && Z == o.Z;
        public override bool Equals(object? obj) => obj is CellKey o && Equals(o);
        public override int GetHashCode() => HashCode.Combine(X, Y, Z);
    }

    private readonly BBox localBox;
    private readonly string id;
    private readonly string type;
    
    public List<Instance> Instances = new();
    public int InstanceCount => Instances.Count;
    public Dictionary<CellKey, List<uint>> Grid = new();
    public float CellSize = 1.0f;
    public bool used = false;

    public StaticCollider(BBox bbox, string id, string type = "") {
        this.localBox = bbox;
        this.id = id;
        this.type = type;
    }

    // Get BBox
    public override BBox GetBBox() {
        BBox v = localBox;
        return v;
    }

    // Get Id
    public override string GetId() {
        string v = id;
        return v;
    }

    // Get Type
    public override string GetType() {
        string v = type;
        return v;
    }

    // Get Cell Size
    public float GetCellSize() {
        float v = CellSize;
        return v;
    }

    // Set Cell Size
    public void SetCellSize(float s) {
        CellSize = s;
    }

    // Get Instances
    public IReadOnlyList<Instance> GetInstances() {
        IReadOnlyList<Instance> v = Instances;
        return v;
    }

    /**
     * Add Instance
     */
    public void AddInstance(uint instId, Vector3 worldPos) {
        Instances.Add(new Instance { Id = instId, Position = worldPos });
        used = true;
    }

    // Clear Instances
    public override void ClearInstances() {
        Instances.Clear();
        Grid.Clear();
    }

    /**
     * Cell Of
     */
    public static CellKey CellOf(float x, float y, float z, float cell) {
        return new() {
            X = (int)MathF.Floor(x / cell),
            Y = (int)MathF.Floor(y / cell),
            Z = (int)MathF.Floor(z / cell)
        };
    }

    /**
     * World Box
     */
    public BBox WorldBox(Instance inst) {
        return new(inst.Position.X + localBox.MinX,
                    inst.Position.Y + localBox.MinY,
                    inst.Position.Z + localBox.MinZ,
                    inst.Position.X + localBox.MaxX,
                    inst.Position.Y + localBox.MaxY,
                    inst.Position.Z + localBox.MaxZ);
    }

    /**
     * Build
     */
    // Build
    public override void Build() {
        BuildGrid();
    }

    // Build Grid
    public void BuildGrid() {
        Grid.Clear();
        for(int i = 0; i < InstanceCount; i++) {
            var b = WorldBox(Instances[i]);
            var lo = CellOf(b.MinX, b.MinY, b.MinZ, CellSize);
            var hi = CellOf(b.MaxX, b.MaxY, b.MaxZ, CellSize);
            for(int x = lo.X; x <= hi.X; x++)
            for(int y = lo.Y; y <= hi.Y; y++)
            for(int z = lo.Z; z <= hi.Z; z++) {
                var key = new CellKey { X = x, Y = y, Z = z };
                if(!Grid.TryGetValue(key, out var list)) Grid[key] = list = new List<uint>();
                list.Add((uint)i);    
            }
        }
        used = false;
    }

    /**
     * Calc Collision
     */
    public CollisionResult CalcCollision(BBox a, BBox b, Instance inst, uint idx) {
        float xO = MathF.Min(a.MaxX, b.MaxX) - MathF.Max(a.MinX, b.MinX);
        float yO = MathF.Min(a.MaxY, b.MaxY) - MathF.Max(a.MinY, b.MinY);
        float zO = MathF.Min(a.MaxZ, b.MaxZ) - MathF.Max(a.MinZ, b.MinZ);
        if(xO <= 0f || yO <= 0f || zO <= 0f) {
            return new CollisionResult(false, Vector3.Zero, 0f,
                                       this, CollisionType.STATIC_COLLIDER, 
                                       b, inst.Id);
        }

        float m = MathF.Min(xO, MathF.Min(yO, zO));

        float acx = (a.MinX + a.MaxX) * 0.5f;
        float acy = (a.MinY + a.MaxY) * 0.5f;
        float acz = (a.MinZ + a.MaxZ) * 0.5f;
        float bcx = (b.MinX + b.MaxX) * 0.5f;
        float bcy = (b.MinY + b.MaxY) * 0.5f;
        float bcz = (b.MinZ + b.MaxZ) * 0.5f;

        var n = Vector3.Zero;
        if(m == xO)         n.X = (acx > bcx) ? 1.0f : -1.0f;
        else if(m == yO)    n.Y = (acy > bcy) ? 1.0f : -1.0f;
        else                n.Z = (acz > bcz) ? 1.0f : -1.0f;

        return new CollisionResult(true, n, m,
                                    this, CollisionType.STATIC_COLLIDER, 
                                    b, inst.Id);
    }

    /**
     * Check Collision
     */
    public void CheckCollision(BBox other, List<CollisionResult> outResults) {
        if(InstanceCount == 0) return;
        if(used) BuildGrid();

        var lo = CellOf(other.MinX, other.MinY, other.MinZ, CellSize);
        var hi = CellOf(other.MaxX, other.MaxY, other.MaxZ, CellSize);

        var c = new HashSet<uint>();
        for(int x = lo.X; x <= hi.X; x++)
        for(int y = lo.Y; y <= hi.Y; y++)
        for(int z = lo.Z; z <= hi.Z; z++) {
            var key = new CellKey { X = x, Y = y, Z = z };
            if(!Grid.TryGetValue(key, out var list)) continue;
            foreach(var i in list) c.Add(i);            
        }

        foreach(uint idx in c) {
            var inst = Instances[(int)idx];
            var wb = WorldBox(inst);
            if(!other.Intersects(wb)) continue;
            outResults.Add(CalcCollision(other, wb, inst, idx));
        }
    }

    /**
     * Remove Collision
     */
    public void RemoveCollider(uint instId) {
        int before = InstanceCount;
        Instances.RemoveAll(i => i.Id == instId);
        if(InstanceCount != before) used = true;
    }
}
/* */

/*****************************
 * Boundary Collider
 **********/
public class BoundaryCollider : Collider {
    private float distance = 0.0f;
    private float thickness = 1.0f;
    private float minHeight = 0.0f, maxHeight = 0.0f;
    private Vector3 center = Vector3.Zero;
    private bool active = true;

    public BoundaryCollider(float distance) {
        SetDistance(distance);
    }

    // Activate
    public void Activate() {
        active = true;
    }

    // Is Active
    public bool IsActive() {
        bool v = active;
        return v;
    }

    // Deactivate
    public void Deactivate() {
        active = false;
    }

    // Get BBox
    public override BBox GetBBox() {
        float v = 1e9f;
        return new BBox(center.X - distance - thickness, -v, center.Z - distance - thickness,
                        center.X + distance + thickness,  v, center.Z + distance + thickness);
    }

    // Get Id
    public override string GetId() {
        string id = "";
        return id;
    }

    // Get Min Height
    public float GetMinHeight() {
        float v = minHeight;
        return v;
    }

    // Get Max Height
    public float GetMaxHeight() {
        float v = maxHeight;
        return v;
    }

    // Get Center
    public Vector3 GetCenter() {
        Vector3 v = center;
        return v;
    }

    // Set Center
    public void SetCenter(Vector3 c) {
        float y = 0.0f;
        center = new Vector3(c.X, y, c.Z);
    }

    // Set Distance
    public void SetDistance(float d) {
        distance = d;
        minHeight = -d;
        maxHeight = d;
    }

    // Is Outside Boundary
    public bool IsOutsideBoundary(Vector3 p) {
        if(!active) return false;
        return MathF.Abs(p.X - center.X) > distance ||
                MathF.Abs(p.Z - center.Z) > distance;
    }

    /**
     * Get Boundary Distance
     */
    public float GetBoundaryDistance() {
        float v = distance;
        return v;
    }

    /**
     * Get Boundary Normal
     */
    public Vector3 GetBoundaryNormal(Vector3 p) {
        var n = Vector3.Zero;
        var l = p - center;
        if(MathF.Abs(l.X) > distance)       n.X = (l.X > 0) ? 1.0f : -1.0f;
        else if(Math.Abs(l.Z) > distance)   n.Z = (l.Z > 0) ? -1.0f : 1.0f;
        return n;
    }

    /**
     * Get Boundary Far
     */
    public float GetBoundaryFar(Vector3 p) {
        var l = p - center;
        float xF = MathF.Max(0.0f, MathF.Abs(l.X) - distance);
        float zF = MathF.Max(0.0f, MathF.Abs(l.Z) - distance);
        return MathF.Max(xF, zF);
    }

    /**
     * Update
     */
    public void Update(Vector3 c, float d) {
        SetCenter(c);
        SetDistance(d);
        Activate();
    }
}
//

/// ------------------------------
/// Collision Result
/// ------------------------------
public class CollisionResult {
    public bool Collided;
    public Vector3 Normal;
    public float Depth;
    public Collider? OtherCollider;
    public CollisionType Type;
    public BBox OtherWorldBox;
    public uint InstanceId;

    public CollisionResult() {
        OtherWorldBox = new BBox();
    }
    public CollisionResult(bool Collided, Vector3 Normal, float Depth,
                            Collider? OtherCollider, CollisionType Type,
                            BBox? BBox = null, uint InstanceId = 0) {
        this.Collided = Collided;
        this.Normal = Normal;
        this.Depth = Depth;
        this.OtherCollider = OtherCollider;
        this.Type = Type;
        OtherWorldBox = BBox ?? new BBox();
        this.InstanceId = InstanceId;
    }
}
//

/// ------------------------------
/// Collision Manager
/// ------------------------------
public class CollisionManager {
    private struct Entry {
        public RigidBody RigidBody;
        public CollisionType Type;
    }

    private readonly Tick tick;
    private readonly Mesh mesh;

    private readonly Dictionary<string, BBox> localBoxCache = new();
    private readonly List<Collider> colliders = new();
    private readonly List<Entry> dynamicRigidBody = new();
    private readonly HashSet<string> colliderIdSet = new();
    private readonly Dictionary<string, StaticCollider> colliderByKey = new();

    public Action<RigidBody, bool>? OnResolved;

    public CollisionManager(Tick tick, Mesh mesh) {
        this.tick = tick;
        this.mesh = mesh;
    }

    // Collider Exists
    public bool ColliderExists(string id) {
        bool v = colliderIdSet.Contains(id);
        return v;
    }

    // Has RigidBody
    public bool HasRigidBody(RigidBody rigidBody) {
        foreach(var e in dynamicRigidBody) if(ReferenceEquals(e.RigidBody, rigidBody)) return true;
        return false;
    }

    // Local Box For
    private BBox LocalBoxFor(string type) {
        if(localBoxCache.TryGetValue(type, out var cached)) return cached;

        float v = 1e30f;
        float xMin = v, yMin = v, zMin = v;
        float xMax = -v, yMax = -v, zMax = -v;

        if(mesh.GetVertices(type) is List<float> verts) {
            int stride = Vertex.VertexStride;
            for(int i = 0; i+2 < verts.Count; i += stride) {
                xMin = MathF.Min(xMin, verts[i+0]); xMax = MathF.Max(xMax, verts[i+0]);
                yMin = MathF.Min(yMin, verts[i+1]); yMax = MathF.Max(yMax, verts[i+1]);
                zMin = MathF.Min(zMin, verts[i+2]); zMax = MathF.Max(zMax, verts[i+2]);
            }
        }

        if(xMax < xMin) {
            xMin = yMin = zMin = 0;
            xMax = yMax = zMax = 0;
        }

        var box = new BBox(xMin, yMin, zMin, xMax, yMax, zMax);
        localBoxCache[type] = box;
        return box;
    }

    // Get Collider
    public Collider? GetCollider(string id) {
        foreach(var c in colliders) if(c.GetId() == id) return c;
        return null;
    }

    // Get Colliders
    public IReadOnlyList<Collider> GetColliders() {
        IReadOnlyList<Collider> v = colliders;
        return v;
    }

    /**
     * Add Collider
     */
    public void AddCollider(Collider collider) {
        if(collider == null) return;
        if(colliders.Contains(collider)) return;
        colliders.Add(collider);
    }

    /**
     * Build
     */
    public void Build() {
        foreach(var c in colliders) c?.Build();
    }

    /**
     * Set
     */
    public void Set(uint id, CollisionType type) {
        switch(type) {
            case CollisionType.STATIC_COLLIDER: {
                string typeName = mesh.GetType(id);
                if(string.IsNullOrEmpty(typeName)) return;

                string sid = typeName;
                if(!colliderByKey.TryGetValue(sid, out var sc)) {
                    var local = LocalBoxFor(typeName);
                    sc = new StaticCollider(local, sid, typeName);
                    colliders.Add(sc);
                    colliderByKey[sid] = sc;
                    colliderIdSet.Add(sid);
                }

                sc.RemoveCollider(id);
                sc.AddInstance(id, mesh.GetPosition(id));
                break;
            }
            case CollisionType.BOUNDARY_COLLIDER: {
                string key = "boundary";
                if(colliderByKey.ContainsKey(key)) return;

                float v = 100.0f;
                var b = new BoundaryCollider(v);
                b.SetCenter(Vector3.Zero);
                b.SetDistance(v);

                colliders.Add(b);
                colliderIdSet.Add(key);
                break;        
            }
        }
    }

    public void Set(CollisionType type) {
        Set(0, type);
    }

    public void Set(RigidBody rigidBody, CollisionType type) {
        foreach(var e in dynamicRigidBody) if(ReferenceEquals(e.RigidBody, rigidBody)) return;
        dynamicRigidBody.Add(new Entry { RigidBody = rigidBody, Type = type });
    }

    /**
     * Check Collision
     */
    public List<CollisionResult> CheckCollision(BBox bbox) {
        var results = new List<CollisionResult>();
        
        foreach(var c in colliders) {
            if(c is BoundaryCollider b) {
                if(b.IsActive()) {
                    var pos = bbox.Center;
                    if(b.IsOutsideBoundary(pos)) {
                        results.Add(new CollisionResult(true, b.GetBoundaryNormal(pos),
                                                        b.GetBoundaryFar(pos), b,
                                                        CollisionType.BOUNDARY_COLLIDER));
                    }
                }
            } else if(c is StaticCollider s) {
                s.CheckCollision(bbox, results);
            }
        }

        return results;
    }

    /**
     * Resolve Collision
     */   
    public void ResolveCollision(RigidBody rigidBody, BBox bbox, List<CollisionResult> collisions) {
        if(collisions.Count == 0) {
            OnResolved?.Invoke(rigidBody, false);
            return;
        }

        collisions.Sort((a, b) => b.Depth.CompareTo(a.Depth));

        bool hasStatic = false;
        bool resolved = false;

        foreach(var c in collisions) {
            if(c.OtherCollider == null) continue;

            if(c.Type == CollisionType.BOUNDARY_COLLIDER) {
                if(c.OtherCollider is BoundaryCollider b) {
                    var pos = rigidBody.GetPosition();
                    float dist = b.GetBoundaryDistance();
                    var center = b.GetCenter();

                    float localX = pos.X - center.X;
                    float localZ = pos.Z - center.Z;

                    if(MathF.Abs(localX) > dist) pos.X = center.X + MathF.CopySign(dist, localX);
                    if(MathF.Abs(localZ) > dist) pos.Z = center.Z + MathF.CopySign(dist, localZ);

                    var vel = rigidBody.GetVelocity();
                    if(c.Normal.X != 0.0f) vel.X = 0.0f;
                    if(c.Normal.Z != 0.0f) vel.Z = 0.0f;
                    rigidBody.SetVelocity(vel);
                    rigidBody.SetPosition(pos);
                }
                continue;
            }
            if(c.Type == CollisionType.STATIC_COLLIDER) {
                if(hasStatic) continue;
                hasStatic = true;

                var pos = rigidBody.GetPosition();
                var vel = rigidBody.GetVelocity();
                var size = rigidBody.GetSize();

                for(int iter = 0; iter < 8; iter++) {
                    var cur = new BBox();
                    cur.SetFromCenter(pos, size);

                    var hits = CheckCollision(cur);
                    CollisionResult? best = null;
                    foreach(var h in hits) {
                        if(h.Type != CollisionType.STATIC_COLLIDER) continue;
                        if(h.Depth <= 0.0f) continue;
                        if(best == null || h.Depth < best.Depth) best = h;
                    }
                    if(best == null) break;

                    pos.X += best.Normal.X * best.Depth;
                    pos.Y += best.Normal.Y * best.Depth;
                    pos.Z += best.Normal.Z * best.Depth;

                    if(best.Normal.Y > 0.5f && vel.Y <= 0.0f) resolved = true;
                    if(MathF.Abs(best.Normal.X) > 0.5f) vel.X = 0.0f;
                    if(MathF.Abs(best.Normal.Y) > 0.5f && vel.Y <= 0.0f) vel.Y = 0.0f;
                    if(MathF.Abs(best.Normal.Z) > 0.5f) vel.Z = 0.0f;
                }

                rigidBody.SetVelocity(vel);
                rigidBody.SetPosition(pos);
            }
        }

        OnResolved?.Invoke(rigidBody, resolved);
    }

    public void ResolveCollision(Collider collider, List<CollisionResult> collisions) {
        if(collisions.Count == 0) return;
        var rb = collider.GetRigidBody();
        if(rb == null) return;
        var bounds = BBox.FromCenter(rb.GetPosition(), rb.GetSize());
        ResolveCollision(rb, bounds, collisions);
    }

    /**
     * Update
     */   
    public void Update() {
        const float MAX_DT = 0.05f;
        const float MAX_STEP = 0.4f;

        var entries = new List<Entry>(dynamicRigidBody);
        foreach(var e in entries) {
            var rb = e.RigidBody;
            if(rb == null) continue;

            float dt = tick.GetDeltaTime();
            if(dt < 0.0f) dt = 0.0f;
            if(dt > MAX_DT) dt = MAX_DT;

            var vel = rb.GetVelocity();
            float speed = MathF.Sqrt(vel.X*vel.X + vel.Y*vel.Y + vel.Z*vel.Z);

            float dist = speed * dt;
            int steps = Math.Max(1, (int)MathF.Ceiling(dist / MAX_STEP));
            steps = Math.Min(steps, 64);

            for(int s = 0; s < steps; s++) {
                vel = rb.GetVelocity();
                rb.SetPosition(rb.GetPosition() + vel * (dt / steps));

                var bounds = new BBox();
                bounds.SetFromCenter(rb.GetPosition(), rb.GetSize());
                var results = CheckCollision(bounds);
                ResolveCollision(rb, bounds, results);
            }
        }
    }

    /**
     * Remove
     */   
    public void Remove(uint id) {
        foreach(var c in colliders) {
            if(c is StaticCollider s) s.RemoveCollider(id);
        }
        Build();
    }

    /**
     * Clear
     */
    // Clear
    public void Clear() {
        colliders.Clear();
        colliderIdSet.Clear();
        colliderByKey.Clear();
        localBoxCache.Clear();
        dynamicRigidBody.Clear();
    }

    // Clear Colliders
    public void ClearColliders() {
        foreach(var c in colliders) c.ClearInstances();
    }
}