// Used ChatGPT to generate this code
// =========================
// PONG VARIABLES
// =========================
let paddleLeft = { x: -0.9, y: 0, w: 0.03, h: 0.25, speed: 0.02 };
let paddleRight = { x: 0.9, y: 0, w: 0.03, h: 0.25, speed: 0.02 };

let ball = { x: 0, y: 0, vx: 0.005, vy: 0.005, size: 0.03 };

let keys = {};

let gameRunning = false;
let gameLoopId = null;

// =========================
// INPUT
// =========================
document.onkeydown = (e) => keys[e.key] = true;
document.onkeyup = (e) => keys[e.key] = false;

// =========================
// DRAW RECTANGLE (NO TRANSLATION)
// =========================
function drawRect(x, y, w, h, color) {
  let vertices = new Float32Array([
    x - w, y - h,
    x + w, y - h,
    x - w, y + h,

    x - w, y + h,
    x + w, y - h,
    x + w, y + h
  ]);

  let vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_Size, 5.0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// =========================
// UPDATE LOGIC
// =========================
function updatePaddles() {
  // Move paddles
  if (keys["w"]) paddleLeft.y += paddleLeft.speed;
  if (keys["s"]) paddleLeft.y -= paddleLeft.speed;

  if (keys["i"]) paddleRight.y += paddleRight.speed;
  if (keys["k"]) paddleRight.y -= paddleRight.speed;

  // Clamp LEFT paddle
  if (paddleLeft.y + paddleLeft.h > 1) {
    paddleLeft.y = 1 - paddleLeft.h;
  }
  if (paddleLeft.y - paddleLeft.h < -1) {
    paddleLeft.y = -1 + paddleLeft.h;
  }

  // Clamp RIGHT paddle
  if (paddleRight.y + paddleRight.h > 1) {
    paddleRight.y = 1 - paddleRight.h;
  }
  if (paddleRight.y - paddleRight.h < -1) {
    paddleRight.y = -1 + paddleRight.h;
  }
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Bounce top/bottom
  if (ball.y > 1 || ball.y < -1) {
    ball.vy *= -1;
  }

  // LEFT paddle collision
    if (
    ball.x - ball.size < paddleLeft.x + paddleLeft.w &&
    ball.x + ball.size > paddleLeft.x - paddleLeft.w &&
    ball.y - ball.size < paddleLeft.y + paddleLeft.h &&
    ball.y + ball.size > paddleLeft.y - paddleLeft.h
    ) {
    ball.vx = Math.abs(ball.vx); // always go right
    ball.x = paddleLeft.x + paddleLeft.w + ball.size; // push out
    }

    // RIGHT paddle collision
    if (
    ball.x + ball.size > paddleRight.x - paddleRight.w &&
    ball.x - ball.size < paddleRight.x + paddleRight.w &&
    ball.y - ball.size < paddleRight.y + paddleRight.h &&
    ball.y + ball.size > paddleRight.y - paddleRight.h
    ) {
    ball.vx = -Math.abs(ball.vx); // always go left
    ball.x = paddleRight.x - paddleRight.w - ball.size; // push out
    }

  // Reset
  if (ball.x > 1 || ball.x < -1) {
    ball.x = 0;
    ball.y = 0;
    ball.vx = (Math.random() > 0.5 ? 1 : -1) * 0.005;
    ball.vy = (Math.random() > 0.5 ? 1 : -1) * 0.005;
  }
}

// =========================
// RENDER
// =========================
function renderPong() {
  drawRect(paddleLeft.x, paddleLeft.y, paddleLeft.w, paddleLeft.h, [1,1,1,1]);
  drawRect(paddleRight.x, paddleRight.y, paddleRight.w, paddleRight.h, [1,1,1,1]);
  drawRect(ball.x, ball.y, ball.size, ball.size, [1,1,1,1]);
}

// =========================
// GAME LOOP
// =========================
function gameLoop() {
  if (!gameRunning || g_mode !== "pong") return;

  gl.clear(gl.COLOR_BUFFER_BIT);

  updatePaddles();
  updateBall();
  renderPong();

  gameLoopId = requestAnimationFrame(gameLoop);
}

// =========================
// START GAME
// =========================
function startPong() {
  if (g_mode === "pong") return;

  g_mode = "pong";
  gameRunning = true;

  // disable drawing controls
  canvas.onmousedown = null;
  canvas.onmousemove = null;

  gameLoop();
}

let g_mode = "draw"; // "draw" or "pong"

function endGame() {
  gameRunning = false;
  g_mode = "draw";

  if (gameLoopId !== null) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }

  // reset game state
  ball.x = 0;
  ball.y = 0;

  paddleLeft.y = 0;
  paddleRight.y = 0;

  // 🔥 restore drawing controls
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {
    if (ev.buttons == 1) click(ev);
  };

  // redraw drawing canvas
  renderAllShapes();
}
