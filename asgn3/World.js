// =============================================================
// World.js  –  CSE160 Assignment 3
// Robert Schmidling | rschmidl@ucsc.edu
//
// 3-approach notes are inlined at each implementation step.
// =============================================================

// =============================================
// Step 5 – Shaders with View + Projection
//
// Approach A (CHOSEN): Three separate uniforms (u_ModelMatrix,
//   u_ViewMatrix, u_ProjectionMatrix). GPU multiplies all three.
//   Most flexible; camera/model logic stays independent.
// Approach B: Pre-multiply MVP on CPU, send single uniform.
//   Fewer uniforms but normal-matrix becomes harder to compute.
// Approach C: Two uniforms — combined VP + separate Model.
//   Good middle ground but less standard.
// =============================================
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4  u_ModelMatrix;
  uniform mat4  u_ViewMatrix;
  uniform mat4  u_ProjectionMatrix;
  uniform mat4  u_NormalMatrix;
  uniform float u_Time;       // seconds elapsed — drives grass wind
  uniform float u_uvRepeat;   // texture repeat multiplier (1 for walls, 32 for ground)
  uniform int   u_isGrass;    // 1 = apply wind sway to top vertices

  varying vec2  v_UV;
  varying vec3  v_Normal;
  varying float v_fogDist;    // view-space depth for fog

  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;

    // --- Plains grass wind animation ---
    // Only displaces the TOP of each blade (a_Position.y near 1).
    // Phase varies per blade using its world XZ position so they don't
    // all sway in unison.
    if (u_isGrass == 1) {
      float phase = worldPos.x * 2.3 + worldPos.z * 1.7;
      float swing = sin(u_Time * 2.5 + phase) * 0.09;
      worldPos.x += swing * a_Position.y;
      worldPos.z += swing * 0.4 * a_Position.y;
    }

    vec4 viewPos = u_ViewMatrix * worldPos;
    v_fogDist    = -viewPos.z;          // positive depth into scene

    gl_Position = u_ProjectionMatrix * viewPos;
    v_UV        = a_UV * u_uvRepeat;    // scaled UVs allow texture repeat on ground
    v_Normal    = normalize(mat3(u_NormalMatrix) * a_Normal);
  }`;

// =============================================
// Step 3 – Pass Texture to Fragment Shader
// Step 4 – Mix base color with texture color
//
// Approach A (CHOSEN): u_whichTexture int switch.
//   -1 = use u_FragColor (solid color), 0-3 = sample that texture unit.
//   Supports up to 4 named samplers; zero-cost for non-textured objects.
// Approach B: Single sampler + texture atlas; UV offset uniform.
// Approach C: u_texColorWeight float; lerp between color and texture.
//   Allows blending but adds uniform overhead.
// =============================================
const FSHADER_SOURCE = `
  precision mediump float;

  uniform vec4      u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform int       u_whichTexture;

  varying vec2  v_UV;
  varying vec3  v_Normal;
  varying float v_fogDist;

  void main() {
    // ----- texture / color selection -----
    vec4 color;
    if      (u_whichTexture == 0) color = texture2D(u_Sampler0, v_UV);
    else if (u_whichTexture == 1) color = texture2D(u_Sampler1, v_UV);
    else if (u_whichTexture == 2) color = texture2D(u_Sampler2, v_UV);
    else if (u_whichTexture == 3) color = texture2D(u_Sampler3, v_UV);
    else if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;   // sky: full-bright, no lighting or fog
      return;
    } else color = u_FragColor;

    // ----- sun lighting (plains high sun) -----
    vec3  sunDir  = normalize(vec3(0.5, 1.0, 0.3));
    float diffuse = max(dot(v_Normal, sunDir), 0.0);
    // Softer shadow floor so grass stays readable in shade
    float light   = clamp(diffuse * 0.65 + 0.5, 0.0, 1.0);

    vec3 lit = color.rgb * light;

    // ----- exponential distance fog (plains haze) -----
    // Fog colour matches the sky so distant objects melt into the horizon.
    vec3  fogColor  = vec3(0.68, 0.84, 1.0);
    float fogFactor = clamp(exp(-v_fogDist * 0.020), 0.0, 1.0);

    gl_FragColor = vec4(mix(fogColor, lit, fogFactor), color.a);
  }`;

// --------------- WebGL globals ---------------
let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_NormalMatrix, u_FragColor, u_whichTexture;
let u_Time, u_isGrass, u_uvRepeat;

// --------------- Camera ----------------------
let camera;

// --------------- Input -----------------------
const g_keys = {};
let   g_pointerLocked = false;

// --------------- Game state ------------------
let g_seconds   = 0;
let g_lastTime  = 0;
let g_placeType = 0;       // 0=brick,1=stone,2=wood — texture for placed blocks

// Gem positions [x, z] in map space; y = 0.5 (hovers above ground)
const GEM_POSITIONS = [
  [5,  5 ], [22, 5 ], [12, 11], [10, 23], [15, 15]
];
const GEM_COLORS = [
  [1,.9,.1,1], [.1,.9,1,1], [1,.2,1,1], [.2,1,.3,1], [1,1,1,1]
];
let g_gemsCollected = 0;
let g_gemAlive      = [true,true,true,true,true];
let g_won           = false;

// =============================================
// Step 10 – World layout as 32×32 2D array
//
// Approach A (CHOSEN): Pre-build an array of wall cube objects at
//   startup from the map; render each frame.
// Approach B: Loop over map every frame without caching objects.
// Approach C: Batch all wall geometry into one combined VBO on init
//   (fastest draw, but no per-cell runtime updates).
//
// Map: g_map[z][x] = wall height (0–4)
//      g_mapType[z][x] = texture index (0=brick,1=stone,2=wood)
// =============================================
// ── Plains biome map ──────────────────────────────────────────
// 0 = flat grass  1 = low grass bump  2 = stone rock  3 = tall rock
// Border ring is height 2 (rolling grassy hills) so the world feels
// enclosed without vertical fortress walls.
// Gem positions (must stay 0): [5,5] [22,5] [12,11] [10,23] [15,15]
/* eslint-disable */
const g_map = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,3,2,0,0,0,0,0,0,0,0,2,3,2,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,3,2,3,0,0,0,0,0,0,0,0,3,2,3,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,3,2,0,0,0,0,0,0,0,0,2,3,2,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,3,2,0,0,0,0,0,0,0,0,0,0,2,3,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2],
  [2,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];
/* eslint-enable */

// border hills = grass (tex 3), grass bumps = grass (tex 3), rocks = stone (tex 1)
const g_mapType = Array.from({length:32}, (_,z) =>
  Array.from({length:32}, (_,x) => {
    if (x===0||x===31||z===0||z===31) return 3; // border → grass hill
    const h = g_map[z][x];
    if (h <= 1) return 3;  // low bump → grass
    return 1;              // rock cluster → stone
  })
);

// ── Plains world objects ──────────────────────────────────────
// Trees: [worldX, worldZ] — rendered in drawTrees(), not in g_map.
const TREE_POSITIONS = [
  [3,6],[6,3],[26,6],[28,3],
  [3,26],[6,28],[26,26],[28,28],
  [14,3],[17,29],
];

// Grass blades: pre-generated once, stored as [x, z, height, greenAmount].
const GRASS_BLADES = (function () {
  const out = [];
  const centers = [
    [4,12],[4,19],[28,12],[28,19],
    [12,4],[20,4],[12,27],[20,27],
    [7,7],[25,7],[7,24],[25,24],
    [14,16],[17,13],
  ];
  for (const [px, pz] of centers) {
    for (let i = 0; i < 12; i++) {
      const bx = px + (Math.random() - 0.5) * 3.5;
      const bz = pz + (Math.random() - 0.5) * 3.5;
      const mx = Math.floor(bx), mz = Math.floor(bz);
      if (mx < 1 || mx > 30 || mz < 1 || mz > 30) continue;
      if (g_map[mz][mx] !== 0) continue;
      out.push([bx, bz, 0.25 + Math.random() * 0.4, 0.55 + Math.random() * 0.25]);
    }
  }
  return out;
}());

// ===========================================
// main()
// ===========================================
function main() {
  canvas = document.getElementById('webgl');
  gl     = canvas.getContext('webgl', { preserveDrawingBuffer:false });
  if (!gl) { alert('WebGL not supported'); return; }

  gl.enable(gl.DEPTH_TEST);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Shader init failed'); return;
  }

  // Attribute locations
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');

  // Uniform locations
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_NormalMatrix     = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_FragColor        = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_whichTexture     = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Time             = gl.getUniformLocation(gl.program, 'u_Time');
  u_isGrass          = gl.getUniformLocation(gl.program, 'u_isGrass');
  u_uvRepeat         = gl.getUniformLocation(gl.program, 'u_uvRepeat');

  // Step 2: Load textures (procedurally generated via 2D canvas)
  initTextures();

  // Step 6: Create camera
  camera = new Camera();

  setupInput();

  gl.clearColor(0.68, 0.84, 1.0, 1.0);  // matches plains fog/sky colour
  requestAnimationFrame(tick);
}

// ===========================================
// TICK – main loop
// ===========================================
function tick(now) {
  const dt = Math.min((now - g_lastTime) / 1000, 0.1);
  g_lastTime = now;
  g_seconds += dt;

  processKeys(dt);
  checkGemCollision();
  renderScene();

  const fps = dt > 0 ? Math.round(1/dt) : 0;
  document.getElementById('fps').textContent = `FPS: ${fps}`;
  const [ex,,ez] = camera.eye;
  document.getElementById('pos').textContent =
    `XZ: ${ex.toFixed(1)}, ${ez.toFixed(1)}`;

  requestAnimationFrame(tick);
}

// ===========================================
// INPUT SETUP
// ===========================================
function setupInput() {
  document.addEventListener('keydown', e => {
    g_keys[e.key.toLowerCase()] = true;
    handleKeyPress(e.key.toLowerCase());
  });
  document.addEventListener('keyup',   e => { g_keys[e.key.toLowerCase()] = false; });

  // Pointer lock for mouse look
  canvas.addEventListener('click', () => {
    if (!g_pointerLocked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    g_pointerLocked = document.pointerLockElement === canvas;
    document.getElementById('lockMsg').style.display = g_pointerLocked ? 'none' : 'block';
  });

  // Mouse look when pointer locked
  document.addEventListener('mousemove', e => {
    if (!g_pointerLocked) return;
    camera.mousePan(-e.movementX, -e.movementY);
  });
}

// ===========================================
// Step 7 – Keyboard movement (smooth via state map)
//
// Approach A (CHOSEN): keydown/keyup populate g_keys{}; game loop
//   reads it each frame for smooth, frame-rate-independent movement.
// Approach B: Immediate discrete step on keydown event only
//   (jerky, no holding).
// Approach C: requestAnimationFrame queries Gamepad API
//   (overkill, controller-specific).
// ===========================================
function processKeys(dt) {
  const s = camera.speed * dt * 60;   // scale by dt so speed is frame-rate-independent
  if (g_keys['w']) camera.moveForward(s);
  if (g_keys['s']) camera.moveBackward(s);
  if (g_keys['a']) camera.moveLeft(s);
  if (g_keys['d']) camera.moveRight(s);
  if (g_keys['q']) camera.panLeft(2.5 * dt * 60);
  if (g_keys['e']) camera.panRight(2.5 * dt * 60);
}

function handleKeyPress(key) {
  // Simple Minecraft: F = add, R = remove
  if (key === 'f') addBlock();
  if (key === 'r') removeBlock();
  // Switch block texture type
  if (key === '1') { g_placeType=0; showStory('Block type: Brick', 1.5); }
  if (key === '2') { g_placeType=1; showStory('Block type: Stone', 1.5); }
  if (key === '3') { g_placeType=2; showStory('Block type: Wood',  1.5); }
}

// ===========================================
// SIMPLE MINECRAFT – add / remove blocks
//
// Approach A: Find cell directly in front using fixed step + Math.round
//   (simple but imprecise — can skip over thin walls).
// Approach B (CHOSEN): Incrementally step forward 0.1 units at a time
//   and check g_map; first non-empty cell = target. Accurate for any
//   camera angle, no raytracer needed.
// Approach C: Full DDA grid traversal (most precise but overkill here).
// ===========================================

// Returns the forward direction projected onto XZ, normalized.
function _forwardXZ() {
  const [ex,,ez] = camera.eye, [ax,,az] = camera.at;
  let fx = ax-ex, fz = az-ez;
  const len = Math.hypot(fx, fz);
  if (len > 0.001) { fx/=len; fz/=len; }
  return [fx, fz];
}

// Steps forward until the first non-empty cell is found (for remove / add-on-top).
// Returns [x, z] or null if nothing within reach.
function _firstFilledBlock() {
  const [ex,,ez] = camera.eye;
  const [fx, fz]  = _forwardXZ();
  for (let d = 0.5; d <= 3.5; d += 0.1) {
    const bx = Math.floor(ex + fx * d);
    const bz = Math.floor(ez + fz * d);
    if (bx < 0 || bx > 31 || bz < 0 || bz > 31) continue;
    if (g_map[bz][bx] > 0) return [bx, bz];
  }
  return null;
}

// Steps forward until the first empty cell is found (for placing new blocks).
function _firstEmptyBlock() {
  const [ex,,ez] = camera.eye;
  const [fx, fz]  = _forwardXZ();
  for (let d = 0.5; d <= 3.5; d += 0.1) {
    const bx = Math.floor(ex + fx * d);
    const bz = Math.floor(ez + fz * d);
    if (bx < 0 || bx > 31 || bz < 0 || bz > 31) continue;
    if (g_map[bz][bx] === 0) return [bx, bz];
  }
  return null;
}

function addBlock() {
  // Place on top of first filled block, OR in first empty cell if nothing is there.
  const target = _firstFilledBlock() || _firstEmptyBlock();
  if (!target) return;
  const [bx, bz] = target;
  if (g_map[bz][bx] < 4) {
    g_map[bz][bx]++;
    g_mapType[bz][bx] = g_placeType;
  }
}

function removeBlock() {
  const target = _firstFilledBlock();
  if (!target) return;
  const [bx, bz] = target;
  if (g_map[bz][bx] > 0) g_map[bz][bx]--;
}

// ===========================================
// GEM COLLECTION
// ===========================================
function checkGemCollision() {
  if (g_won) return;
  const [ex,,ez] = camera.eye;
  let changed = false;

  for (let i = 0; i < GEM_POSITIONS.length; i++) {
    if (!g_gemAlive[i]) continue;
    const [gx,gz] = GEM_POSITIONS[i];
    const dx = ex-(gx+0.5), dz = ez-(gz+0.5);
    if (Math.hypot(dx,dz) < 1.3) {
      g_gemAlive[i] = false;
      g_gemsCollected++;
      changed = true;
      showStory(`Gem ${g_gemsCollected}/${GEM_POSITIONS.length} collected!`, 2);
    }
  }

  if (changed) {
    document.getElementById('gems').textContent =
      `Gems: ${g_gemsCollected} / ${GEM_POSITIONS.length}`;
  }

  if (g_gemsCollected >= GEM_POSITIONS.length && !g_won) {
    g_won = true;
    showStory('You found all the gems! The Peacock dances with joy! 🦚', 10);
  }
}

// --------------- HUD helper -----------------
let g_storyTimeout = null;
function showStory(msg, seconds) {
  const el = document.getElementById('story');
  el.textContent = msg;
  if (g_storyTimeout) clearTimeout(g_storyTimeout);
  g_storyTimeout = setTimeout(() => { el.textContent=''; }, seconds*1000);
}

// ===========================================
// TEXTURES (Step 2)
//
// Approach A: Procedural textures via offscreen <canvas> — no files needed.
// Approach B (CHOSEN): Load image files via new Image() + onload callback,
//   matching the TexturedQuad example from Matsuda Ch.5. Files must be
//   square and a power-of-2 in size (128×128 SVGs here).
// Approach C: Pass raw Uint8Array pixel data directly to texImage2D.
//   Full control, no files, but tedious to author.
// ===========================================
function initTextures() {
  const files   = [
    'textures/brick.svg',
    'textures/stone.svg',
    'textures/wood.svg',
    'textures/grass.svg',
  ];
  const samplers = ['u_Sampler0','u_Sampler1','u_Sampler2','u_Sampler3'];
  files.forEach((url, i) => loadTexture(url, i, samplers[i]));
}

// Step 2: Standard file-loading pattern from Matsuda TexturedQuad example.
// The image is drawn onto a guaranteed 128×128 (power-of-2) canvas before
// upload so mip-mapping and gl.REPEAT wrapping always work correctly.
function loadTexture(url, unit, samplerName) {
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = function () {
    // Draw into a fixed 128×128 canvas — guarantees power-of-2 dimensions
    // regardless of how the browser rasterises the source SVG.
    const sz  = 128;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = sz;
    cvs.getContext('2d').drawImage(img, 0, 0, sz, sz);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.uniform1i(gl.getUniformLocation(gl.program, samplerName), unit);
  };
  img.onerror = () => console.error(`Failed to load texture: ${url}`);
  img.src = url;
}

// ===========================================
// RENDER SCENE
// ===========================================
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Upload view + projection matrices
  gl.uniformMatrix4fv(u_ViewMatrix,       false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  // Default plains uniforms
  gl.uniform1f(u_Time,     g_seconds);
  gl.uniform1i(u_isGrass,  0);
  gl.uniform1f(u_uvRepeat, 1.0);

  // Step 9 – Sky box
  drawSky();

  // Step 8 – Ground (overrides uvRepeat internally)
  drawGround();

  // Step 10 – Walls from map
  drawWalls();

  // Plains biome details
  drawTrees();
  drawGrassBlades();

  // Gems
  drawGems();

  // Animal – Peacock at world center
  drawPeacock(15.5, 0, 15.5);
}

// ===========================================
// Step 8 – Ground Plane
//
// Approach A (CHOSEN): Single cube scaled to (32, 0.05, 32),
//   placed at y=-0.05 to fill the floor. Grass texture.
// Approach B: Separate quad geometry (4 vertices, 2 triangles)
//   without the cube class overhead.
// Approach C: Per-cell floor tiles (32×32 draws) — allows
//   different floor materials per cell.
// ===========================================
function drawGround() {
  gl.uniform1f(u_uvRepeat, 32.0);  // tile grass texture 32× across the floor
  const M = new Matrix4();
  M.translate(0, -0.05, 0);
  M.scale(32, 0.05, 32);
  Cube.draw(M, [0.4,0.7,0.3,1], 3);  // texture 3 = grass
  gl.uniform1f(u_uvRepeat, 1.0);
}

// ===========================================
// Step 9 – Sky Box
//
// Approach A (CHOSEN): Giant cube (500×500×500) centered at
//   world center; solid blue, no texture. Depth test lets walls
//   render over it naturally.
// Approach B: Render a screen-space quad first with depth-writes
//   disabled; sky always stays behind geometry.
// Approach C: In fragment shader, if no geometry was hit, output
//   sky gradient based on view direction. (Requires deferred pass.)
// ===========================================
function drawSky() {
  const M = new Matrix4();
  M.translate(-250+16, -250+16, -250+16);
  M.scale(500, 500, 500);
  Cube.draw(M, [0.68, 0.84, 1.0, 1], -2);  // matches fog colour — seamless horizon
}

// ===========================================
// Step 10 – Walls
// ===========================================
function drawWalls() {
  const M   = new Matrix4();   // reuse one matrix to reduce GC pressure
  const clr = [1,1,1,1];
  for (let z = 0; z < 32; z++) {
    for (let x = 0; x < 32; x++) {
      const h = g_map[z][x];
      if (h === 0) continue;
      const tex = g_mapType[z][x];
      for (let y = 0; y < h; y++) {
        M.setIdentity();
        M.translate(x, y, z);
        Cube.draw(M, clr, tex);
      }
    }
  }
}

// ===========================================
// TREES – Minecraft-style: wood trunk + leaf canopy
// ===========================================
function drawTrees() {
  const M     = new Matrix4();
  const white = [1, 1, 1, 1];
  const leaf  = [0.15, 0.55, 0.1, 1];

  for (const [tx, tz] of TREE_POSITIONS) {
    // Trunk: 1×3 column, wood texture (2)
    for (let y = 0; y < 3; y++) {
      M.setIdentity();
      M.translate(tx, y, tz);
      Cube.draw(M, white, 2);
    }
    // Canopy: 3×2×3 block of leaves, solid green
    for (let dy = 0; dy < 2; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          M.setIdentity();
          M.translate(tx + dx, 3 + dy, tz + dz);
          Cube.draw(M, leaf, -1);
        }
      }
    }
  }
}

// ===========================================
// GRASS BLADES – thin vertical cubes with wind shader
// ===========================================
function drawGrassBlades() {
  gl.uniform1i(u_isGrass, 1);   // enable wind sway in vertex shader
  const M = new Matrix4();

  for (const [bx, bz, h, g] of GRASS_BLADES) {
    // Color: interpolate dark-green → bright-green via g (greenAmount)
    const r = 0.1 + g * 0.25;
    const gv = 0.45 + g * 0.35;
    M.setIdentity();
    M.translate(bx, 0, bz);
    M.scale(0.06, h, 0.06);
    Cube.draw(M, [r, gv, 0.08, 1], -1);
  }

  gl.uniform1i(u_isGrass, 0);   // restore for subsequent draws
}

// ===========================================
// GEMS
// ===========================================
function drawGems() {
  const bob   = 0.15 * Math.sin(g_seconds * 2);
  const pulse = 0.07 * Math.sin(g_seconds * 4);
  const s     = 0.35 + pulse;

  for (let i = 0; i < GEM_POSITIONS.length; i++) {
    if (!g_gemAlive[i]) continue;
    const [gx, gz] = GEM_POSITIONS[i];
    const M = new Matrix4();
    M.translate(gx + 0.5 - s/2, 0.5 + bob, gz + 0.5 - s/2);
    M.scale(s, s, s);
    Cube.draw(M, GEM_COLORS[i], -1);
  }
}

// ===========================================
// PEACOCK (animal requirement)
// Adapted from Assignment 2; placed as 3D world entity.
// World base at (wx, wy, wz), scaled to ~2 world units tall.
// ===========================================
function drawPeacock(wx, wy, wz) {
  const t     = g_seconds;
  const dance = g_won;

  // Animation values
  const wingL  = dance ? 40*Math.sin(t*5)  : 10*Math.sin(t*1.2);
  const wingR  = dance ? -40*Math.sin(t*5) : -10*Math.sin(t*1.2);
  const tail   = 15*Math.sin(t*1.5);
  const legL   = dance ? 25*Math.sin(t*4)  : 8*Math.sin(t*1.8);
  const legR   = dance ? -25*Math.sin(t*4) : -8*Math.sin(t*1.8);
  const kneeL  = dance ? 20*Math.abs(Math.sin(t*4)) : 5*Math.abs(Math.sin(t*1.8));
  const kneeR  = dance ? -20*Math.abs(Math.sin(t*4)): 5*Math.abs(Math.sin(t*1.8));
  const headA  = 8*Math.sin(t*2.5);

  // World base matrix – scale and position the peacock
  // Feet are approximately at local y = -0.55 (after leg calcs), *2 scale = -1.1
  // Raise by 1.1 so feet sit on ground.
  function worldBase(localScale) {
    const M = new Matrix4();
    M.translate(wx, wy + 1.1, wz);
    M.scale(localScale, localScale, localScale);
    return M;
  }

  const SC = 2.0;
  const bodyBase = worldBase(SC);
  bodyBase.translate(-0.25, -0.3, 0);
  bodyBase.rotate(-2, 1, 0, 0);

  // Body
  const body = new Cube();
  body.color  = [0.1, 0.4, 0.8, 1];
  body.matrix = new Matrix4(bodyBase);
  body.matrix.translate(0, 0, -0.40);
  body.matrix.scale(0.5, 0.28, 0.6);
  body.render();

  // Neck lower
  const neckJoint = new Matrix4(bodyBase);
  neckJoint.translate(0.25, 0.28, 0.1);
  neckJoint.rotate(40+headA, 1, 0, 0);

  const neck1 = new Cube();
  neck1.color  = [0, 0.6, 1, 1];
  neck1.matrix = new Matrix4(neckJoint);
  neck1.matrix.translate(-0.04, 0, -0.04);
  neck1.matrix.scale(0.08, 0.18, 0.08);
  neck1.render();

  // Neck upper
  const neck2Joint = new Matrix4(neckJoint);
  neck2Joint.translate(0, 0.18, 0);
  neck2Joint.rotate(-40, 1, 0, 0);

  const neck2 = new Cube();
  neck2.color  = [0, 0.7, 1, 1];
  neck2.matrix = new Matrix4(neck2Joint);
  neck2.matrix.translate(-0.04, 0, -0.04);
  neck2.matrix.scale(0.08, 0.18, 0.08);
  neck2.render();

  // Head
  const headJoint = new Matrix4(neck2Joint);
  headJoint.translate(0, 0.18, 0);
  headJoint.rotate(10, 1, 0, 0);

  const head = new Cube();
  head.color  = [0, 0.8, 0.8, 1];
  head.matrix = new Matrix4(headJoint);
  head.matrix.translate(-0.06, 0, -0.06);
  head.matrix.scale(0.15, 0.15, 0.15);
  head.render();

  // Beak
  const beak = new Cone();
  beak.color  = [1.0, 0.75, 0.15, 1];
  beak.matrix = new Matrix4(headJoint);
  beak.matrix.translate(0.01, 0.05, 0.1);
  beak.matrix.rotate(90, 1, 0, 0);
  beak.matrix.scale(0.06, 0.2, 0.06);
  beak.render();

  // Wings
  function drawWing(xOff, angle) {
    const joint = new Matrix4(bodyBase);
    joint.translate(xOff, 0.13, -0.05);
    joint.rotate(angle, 0, 0, 1);
    const wing = new Cube();
    wing.color  = [0.2, 0.6, 0.2, 1];
    wing.matrix = new Matrix4(joint);
    if (xOff === 0) wing.matrix.translate(-0.42, -0.045, -0.14);
    else            wing.matrix.translate( 0,    -0.045, -0.14);
    wing.matrix.scale(0.42, 0.09, 0.28);
    wing.render();
  }
  drawWing(0,   wingL);
  drawWing(0.5, wingR);

  // Tail base
  const tailBaseJoint = new Matrix4(bodyBase);
  tailBaseJoint.translate(0.25, 0.15, -0.18);
  tailBaseJoint.rotate(-20, 1, 0, 0);

  const tailBase = new Cube();
  tailBase.color  = [0.1, 0.5, 0.2, 1];
  tailBase.matrix = new Matrix4(tailBaseJoint);
  tailBase.matrix.translate(-0.05, -0.05, -0.08);
  tailBase.matrix.scale(0.1, 0.1, 0.16);
  tailBase.render();

  // Tail fan
  const tailJoint = new Matrix4(tailBaseJoint);
  tailJoint.translate(0, 0.05, -0.12);
  tailJoint.rotate(-20, 1, 0, 0);
  tailJoint.rotate(tail,  0, 1, 0);

  const featherCount = dance ? 15 : 9;
  const spread       = dance ? 120 : 80;

  for (let i = 0; i < featherCount; i++) {
    const angle = -spread/2 + (spread/(featherCount-1))*i;
    const fj    = new Matrix4(tailJoint);
    fj.rotate(angle, 0, 0.5, 1);
    fj.translate(0, 0.1, -0.25);

    const feather = new Cube();
    feather.color  = [[0,.8,.4,1],[0,.6,1,1],[0,.9,.7,1]][i%3];
    feather.matrix = new Matrix4(fj);
    feather.matrix.scale(0.06, 0.8, 0.04);
    feather.render();

    const tip = new Cone();
    tip.color  = [0.2, 0.8, 0.4, 1];
    tip.matrix = new Matrix4(fj);
    tip.matrix.translate(0, 0.9, 0);
    tip.matrix.scale(0.05, 0.2, 0.05);
    tip.render();
  }

  // Legs
  function drawLeg(xOff, hipA, kneeA) {
    const hip = new Matrix4(bodyBase);
    hip.translate(xOff, -0.02, -0.1);
    hip.rotate(25,  1, 0, 0);
    hip.rotate(hipA, 1, 0, 0);

    const upper = new Cube();
    upper.color  = [0.9, 0.8, 0.2, 1];
    upper.matrix = new Matrix4(hip);
    upper.matrix.translate(-0.03, -0.18, -0.03);
    upper.matrix.scale(0.06, 0.3, 0.06);
    upper.render();

    const knee = new Matrix4(hip);
    knee.translate(0, -0.18, 0);
    knee.rotate(-40,  1, 0, 0);
    knee.rotate(kneeA, 1, 0, 0);

    const lower = new Cube();
    lower.color  = [0.9, 0.8, 0.2, 1];
    lower.matrix = new Matrix4(knee);
    lower.matrix.translate(-0.025, -0.35, -0.025);
    lower.matrix.scale(0.05, 0.35, 0.05);
    lower.render();

    const foot = new Cube();
    foot.color  = [0.8, 0.6, 0.2, 1];
    foot.matrix = new Matrix4(knee);
    foot.matrix.translate(0, -0.35, 0);
    foot.matrix.translate(-0.07, -0.02, 0);
    foot.matrix.scale(0.14, 0.03, 0.18);
    foot.render();
  }

  drawLeg(0.15, legL, kneeL);
  drawLeg(0.35, legR, kneeR);
}
