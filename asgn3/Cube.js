// =============================================================
// Cube.js  –  Unit cube with normals + UV texture coordinates
//
// Step 1 – UV Coordinates:
//   Approach A (CHOSEN): Separate UV buffer. Clean separation;
//     same static buffer reused for every cube instance.
//   Approach B: Interleaved [pos, uv, normal] buffer. One bind
//     per draw but harder to modify individually.
//   Approach C: Compute UVs procedurally in vertex shader from
//     position (e.g., v_UV = a_Position.xy). No buffer needed
//     but inflexible for non-cube shapes.
//
// Step 3 – Passing Texture to Fragment Shader:
//   Approach A (CHOSEN): Multiple sampler2D uniforms with an
//     int switch (u_whichTexture). Easy to add textures up to GL max.
//   Approach B: Pack all textures in a single atlas image; use
//     UV offset uniform per texture. One bind but complex math.
//   Approach C: Rebind a single sampler each draw via
//     gl.activeTexture + gl.bindTexture. Simpler shader but more
//     GL calls per frame.
// =============================================================

let g_cubeBuffer       = null;
let g_cubeNormalBuffer = null;
let g_cubeUVBuffer     = null;
let g_cubeInited       = false;

class Cube {
  constructor() {
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;   // -1 = solid color, 0-3 = texture index
  }

  static initBuffer() {
    if (g_cubeInited) return;
    g_cubeInited = true;

    // Unit cube: (0,0,0) → (1,1,1)
    const vertices = new Float32Array([
      // Front  (z=0, normal 0,0,-1)
      0,0,0, 1,1,0, 1,0,0,
      0,0,0, 0,1,0, 1,1,0,
      // Top    (y=1, normal 0,1,0)
      0,1,0, 0,1,1, 1,1,1,
      0,1,0, 1,1,1, 1,1,0,
      // Back   (z=1, normal 0,0,1)
      0,0,1, 1,0,1, 1,1,1,
      0,0,1, 1,1,1, 0,1,1,
      // Left   (x=0, normal -1,0,0)
      0,0,0, 0,0,1, 0,1,1,
      0,0,0, 0,1,1, 0,1,0,
      // Right  (x=1, normal 1,0,0)
      1,0,0, 1,1,0, 1,1,1,
      1,0,0, 1,1,1, 1,0,1,
      // Bottom (y=0, normal 0,-1,0)
      0,0,0, 1,0,1, 0,0,1,
      0,0,0, 1,0,0, 1,0,1,
    ]);

    const normals = new Float32Array([
      0,0,-1,0,0,-1,0,0,-1,  0,0,-1,0,0,-1,0,0,-1,   // Front
      0,1,0, 0,1,0, 0,1,0,   0,1,0, 0,1,0, 0,1,0,    // Top
      0,0,1, 0,0,1, 0,0,1,   0,0,1, 0,0,1, 0,0,1,    // Back
      -1,0,0,-1,0,0,-1,0,0,  -1,0,0,-1,0,0,-1,0,0,   // Left
      1,0,0, 1,0,0, 1,0,0,   1,0,0, 1,0,0, 1,0,0,    // Right
      0,-1,0,0,-1,0,0,-1,0,  0,-1,0,0,-1,0,0,-1,0,   // Bottom
    ]);

    // Step 1: UV coordinates — each face maps (0,0)→(1,1)
    const uvs = new Float32Array([
      // Front
      0,0, 1,1, 1,0,   0,0, 0,1, 1,1,
      // Top
      0,1, 0,0, 1,0,   0,1, 1,0, 1,1,
      // Back (mirrored so texture isn't flipped)
      1,0, 0,0, 0,1,   1,0, 0,1, 1,1,
      // Left
      1,0, 0,0, 0,1,   1,0, 0,1, 1,1,
      // Right
      0,0, 0,1, 1,1,   0,0, 1,1, 1,0,
      // Bottom
      0,1, 1,0, 0,0,   0,1, 1,1, 1,0,
    ]);

    g_cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    g_cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    g_cubeUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  }

  render() {
    Cube.draw(this.matrix, this.color, this.textureNum);
  }

  static draw(M, color, textureNum = -1) {
    Cube.initBuffer();

    gl.uniform1i(u_whichTexture, textureNum);
    gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

    const nm = new Matrix4();
    nm.setInverseOf(M);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);
    gl.uniformMatrix4fv(u_ModelMatrix,  false, M.elements);

    // Position
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Normal
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeNormalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // UV — Step 1: bind dedicated UV buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
