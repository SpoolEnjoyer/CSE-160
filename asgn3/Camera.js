// =============================================================
// Camera.js  –  First-person camera  (Step 6)
//
// Approach A (CHOSEN): ES6 class storing eye/at/up as raw element
//   arrays; builds Matrix4 view via setLookAt each move.
// Approach B: Plain object literal + standalone functions (less OOP).
// Approach C: Store yaw/pitch angles + position; recompute at
//   from trig each frame (simpler for mouse but loses strafe direction).
// =============================================================

class Camera {
  constructor() {
    // --- Step 6: Camera attributes ---
    this.fov   = 60;
    // Start near the south wall, looking north (+Z direction in world)
    this.eye   = [2.5, 1.5,  2.5];
    this.at    = [2.5, 1.5,  5.0];
    this.up    = [0,   1,    0  ];
    this.speed = 0.15;

    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this._buildView();
    this._buildProj();
  }

  _buildView() {
    const [ex,ey,ez] = this.eye;
    const [ax,ay,az] = this.at;
    const [ux,uy,uz] = this.up;
    this.viewMatrix.setLookAt(ex,ey,ez, ax,ay,az, ux,uy,uz);
  }

  _buildProj() {
    this.projectionMatrix.setPerspective(
      this.fov, canvas.width / canvas.height, 0.1, 1000
    );
  }

  // --- Step 7: Move forward ---
  // Approach A (CHOSEN): compute forward vector f = at - eye,
  //   normalize, scale by speed, add to both eye and at.
  // Approach B: use only XZ components so vertical look doesn't
  //   change altitude (FPS-style horizontal movement).
  // Approach C: maintain a persistent forward vector as a class field.
  moveForward(s) {
    s = s ?? this.speed;
    const [ex,ey,ez] = this.eye, [ax,ay,az] = this.at;
    let fx=ax-ex, fy=ay-ey, fz=az-ez;
    const len = Math.hypot(fx,fy,fz);
    fx/=len; fy/=len; fz/=len;
    this.eye[0]+=fx*s; this.eye[1]+=fy*s; this.eye[2]+=fz*s;
    this.at[0] +=fx*s; this.at[1] +=fy*s; this.at[2] +=fz*s;
    this._buildView();
  }

  moveBackward(s) { this.moveForward(-(s ?? this.speed)); }

  // --- Move left ---
  // Approach A (CHOSEN): side = up × forward (cross product).
  // Approach B: rotate forward 90° around world Y then normalize.
  // Approach C: cache the right vector as a class property.
  moveLeft(s) {
    s = s ?? this.speed;
    const [ex,ey,ez] = this.eye, [ax,ay,az] = this.at;
    const [ux,uy,uz] = this.up;
    let fx=ax-ex, fy=ay-ey, fz=az-ez;
    // side = up × f
    let sx=uy*fz-uz*fy, sy=uz*fx-ux*fz, sz=ux*fy-uy*fx;
    const len = Math.hypot(sx,sy,sz);
    sx/=len; sy/=len; sz/=len;
    this.eye[0]+=sx*s; this.eye[1]+=sy*s; this.eye[2]+=sz*s;
    this.at[0] +=sx*s; this.at[1] +=sy*s; this.at[2] +=sz*s;
    this._buildView();
  }

  moveRight(s) { this.moveLeft(-(s ?? this.speed)); }

  // --- Pan (rotate camera) ---
  // Approach A (CHOSEN): rotate forward vector around up using
  //   Matrix4.setRotate, update the "at" point.
  // Approach B: modify yaw angle and recompute at from cos/sin.
  // Approach C: quaternion rotation (more robust for combined
  //   pan+tilt but overkill here).
  panLeft(deg) {
    deg = deg ?? 2.0;
    const [ex,ey,ez] = this.eye, [ax,ay,az] = this.at;
    const [ux,uy,uz] = this.up;
    const rot = new Matrix4();
    rot.setRotate(deg, ux, uy, uz);
    const f  = new Vector3([ax-ex, ay-ey, az-ez]);
    const fp = rot.multiplyVector3(f);
    this.at[0] = ex + fp.elements[0];
    this.at[1] = ey + fp.elements[1];
    this.at[2] = ez + fp.elements[2];
    this._buildView();
  }

  panRight(deg) { this.panLeft(-(deg ?? 2.0)); }

  // --- Mouse look: horizontal pan + vertical tilt ---
  // Approach A (CHOSEN): panLeft for horizontal; compute right = f×up,
  //   rotate around it for vertical tilt; clamp to avoid gimbal flip.
  // Approach B: store yaw+pitch; update and recompute at each call.
  // Approach C: use deltaMovement from PointerLock events directly.
  mousePan(dx, dy) {
    if (dx) this.panLeft(dx * 0.25);
    if (!dy) return;
    const [ex,ey,ez] = this.eye, [ax,ay,az] = this.at;
    const [ux,uy,uz] = this.up;
    const fx=ax-ex, fy=ay-ey, fz=az-ez;
    // right = f × up
    let rx=fy*uz-fz*uy, ry=fz*ux-fx*uz, rz=fx*uy-fy*ux;
    const rlen = Math.hypot(rx,ry,rz);
    rx/=rlen; ry/=rlen; rz/=rlen;
    const rot = new Matrix4();
    rot.setRotate(dy * 0.25, rx, ry, rz);
    const f  = new Vector3([fx,fy,fz]);
    const fp = rot.multiplyVector3(f);
    const fe = fp.elements;
    const flen = Math.hypot(fe[0],fe[1],fe[2]);
    // Clamp: prevent looking straight up/down
    if (Math.abs(fe[1]/flen) < 0.98) {
      this.at[0] = ex + fe[0];
      this.at[1] = ey + fe[1];
      this.at[2] = ez + fe[2];
      this._buildView();
    }
  }

}
