
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec3 v_Normal;

  void main() {

    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

    vec3 n = mat3(u_NormalMatrix) * a_Normal;

    float len = length(n);

    if(len < 0.0001){
      n = vec3(0.0, 1.0, 0.0);
    }

    v_Normal = normalize(n);
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;

  uniform vec4 u_FragColor;
  varying vec3 v_Normal;

  void main() {

    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));

    float diffuse = max(dot(normalize(v_Normal), lightDir), 0.0);

    float ambient = 0.2;

    vec3 color = u_FragColor.rgb * (diffuse + ambient);

    gl_FragColor = vec4(color, u_FragColor.a);
  }`

// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let a_Normal;
let g_targetFPS = 240;
let g_frameInterval = 1000 / g_targetFPS;
let g_lastFrameTime = 0;
let u_NormalMatrix;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix){
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix){
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get a_Normal');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if(!u_NormalMatrix){
    console.log('Failed to get u_NormalMatrix');
    return;
  }
  

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}
// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType=POINT;
let g_selectedSegment=10;

function addActionsForHTMLUI(){

  // camera
  document.getElementById("cameraAngleSlide").addEventListener("input", function(){
    g_globalAngle = this.value;
    renderScene();
  });

  // head
  document.getElementById("headSlide").addEventListener("input", function(){
    g_headAngle = this.value;
    renderScene();
  });

  // wings
  document.getElementById("leftShoulder").addEventListener("input", function(){
    g_leftShoulder = this.value;
    renderScene();
  });

  document.getElementById("rightShoulder").addEventListener("input", function(){
    g_rightShoulder = this.value;
    renderScene();
  });

  // tail
  document.getElementById("tailSlide").addEventListener("input", function(){
    g_tailAngle = this.value;
    renderScene();
  });

  // legs
  document.getElementById("leftLeg").addEventListener("input", function(){
    g_leftLeg = this.value;
    renderScene();
  });

  document.getElementById("rightLeg").addEventListener("input", function(){
    g_rightLeg = this.value;
    renderScene();
  });

  // knees
  document.getElementById("leftKnee").addEventListener("input", function(){
    g_leftKnee = this.value;
    renderScene();
  });

  document.getElementById("rightKnee").addEventListener("input", function(){
    g_rightKnee = this.value;
    renderScene();
  });

  // animation buttons
  document.getElementById("animOn").onclick = function(){
    g_animation = true;
  };

  document.getElementById("animOff").onclick = function(){
    g_animation = false;
  };

  document.getElementById("leftElbow")?.addEventListener("input", function(){
  g_leftElbow = this.value;
  renderScene();
  });

  document.getElementById("rightElbow")?.addEventListener("input", function(){
    g_rightElbow = this.value;
    renderScene();
  });

  // feet
  document.getElementById("leftFoot").addEventListener("input", function(){
    g_leftFoot = this.value;
    renderScene();
  });

  document.getElementById("rightFoot").addEventListener("input", function(){
    g_rightFoot = this.value;
    renderScene();
  });

    // RESET BUTTON
  document.getElementById("resetButton").addEventListener("click", function(){
    resetPose();
  });


}
  

function tick(currentTime) {

  if(!currentTime) currentTime = performance.now();

  const delta = currentTime - g_lastFrameTime;

  if(delta < g_frameInterval){
    requestAnimationFrame(tick);
    return;
  }

  g_lastFrameTime = currentTime;

  g_seconds = currentTime / 1000;

  updateAnimationAngles();

  renderScene();

  requestAnimationFrame(tick);
}

function syncSliders() {

  document.getElementById("headSlide").value = g_headAngle;
  document.getElementById("leftShoulder").value = g_leftShoulder;
  document.getElementById("rightShoulder").value = g_rightShoulder;

  document.getElementById("tailSlide").value = g_tailAngle;

  document.getElementById("leftLeg").value = g_leftLeg;
  document.getElementById("rightLeg").value = g_rightLeg;
  document.getElementById("leftKnee").value = g_leftKnee;
  document.getElementById("rightKnee").value = g_rightKnee;
  document.getElementById("leftFoot").value = g_leftFoot;
  document.getElementById("rightFoot").value = g_rightFoot;
}

function main() {
  // Setup canvas and GL variables
  setupWebGL();
  // Setup GLSL shader programs and connect to GLSL variables
  connectVariablesToGLSL();
  
  addActionsForHTMLUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function(ev){

  if(ev.shiftKey){
    g_poke = true;
    g_pokeStart = g_seconds;   // IMPORTANT FIX
  }

  click(ev);
};

  // canvas.onmousemove = click;
  canvas.onmousemove = function(ev){

  if(ev.buttons == 1){

    g_globalAngle = ev.clientX;

    renderScene();
  }
};

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  requestAnimationFrame(tick);

}

var g_shapeList = [];

function click(ev) {
  // Extract the event click and return it in WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);

  // Create and store the new Point
  let point;
  if(g_selectedType == POINT){
    point = new Point();
  } else if(g_selectedType == TRIANGLE){
    point = new Triangle();
  } else {
    point = new Circle();
  }
  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  point.segments = g_selectedSegment;
  g_shapeList.push(point);

  // Draw every shape that is supposed to be in the canvas
  renderScene();
  
}

function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  return ([x,y]);
}


// Animal Joints
let g_headAngle = 0;
let g_leftShoulder = 0;
let g_leftElbow = 0;
let g_rightShoulder = 0;
let g_rightElbow = 0;
let g_tailAngle = 0;
let g_globalAngle = 0;
let g_leftLeg = 0;
let g_rightLeg = 0;
let g_leftKnee = 0;
let g_rightKnee = 0;
let g_leftFoot = 0;
let g_rightFoot = 0;

// animation variables
let g_animation = false;
let g_seconds = 0;
let g_poke = false;
let g_pokeStart = 0;
let g_pokeDuration = 1.0; // seconds

function updateAnimationAngles(){

  if(!g_animation && !g_poke) return;

  let t = g_seconds;

  // base animation
  if(g_animation){
    g_leftShoulder = 30*Math.sin(t*3);
    g_rightShoulder = -30*Math.sin(t*3);

    g_tailAngle = 20*Math.sin(t*2);

    g_leftLeg = 20*Math.sin(t*2);
    g_rightLeg = -20*Math.sin(t*2);

    g_leftKnee = 30*Math.sin(t*2);
    g_rightKnee = -30*Math.sin(t*2);

    g_leftFoot = -15*Math.sin(g_seconds*2);
    g_rightFoot = 15*Math.sin(g_seconds*2);

    g_headAngle = 10 * Math.sin(t * 4);
  }

  // poke overrides (ADDITIVE, not replacement)
  let pokeT = t - g_pokeStart;

  if(g_poke && pokeT < g_pokeDuration){

    let x = pokeT / g_pokeDuration;
    let recoil = Math.sin(x * Math.PI);

    g_headAngle += 30 * recoil;
    g_tailAngle += -25 * recoil;

    g_leftShoulder += -20 * recoil;
    g_rightShoulder += -20 * recoil;

    g_leftLeg += 10 * recoil;
    g_rightLeg += 10 * recoil;
  } 

  if(g_poke && pokeT >= g_pokeDuration){
  g_poke = false;
}
}
function resetPose(){

  // head
  g_headAngle = 0;
  g_headOffsetY = 0;

  // shoulders / arms
  g_leftShoulder = 0;
  g_rightShoulder = 0;
  g_leftArmOffsetX = 0;
  g_rightArmOffsetX = 0;

  // legs
  g_leftLeg = 0;
  g_rightLeg = 0;
  g_leftKnee = 0;
  g_rightKnee = 0;

  g_leftLegOffsetX = 0;
  g_rightLegOffsetX = 0;
  g_legOffsetY = 0;

  // feet
  g_leftFoot = 0;
  g_rightFoot = 0;

  // tail
  g_tailAngle = 0;

  // animation states
  g_animation = false;
  g_poke = false;
  g_explode = 0;
  g_pokeStart = 0;
  renderAllShapes(); // redraw scene
}

function renderScene() {

  const startTime = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const globalRot = new Matrix4();
  globalRot.rotate(180 + g_globalAngle, 0, 1, 0);
  globalRot.translate(0, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix,false,globalRot.elements);

  /* ---------- BODY ---------- */

  const bodyBase = new Matrix4();
  bodyBase.translate(-0.25,-0.3,0);
  bodyBase.rotate(-2,1,0,0);

  const body = new Cube();
  body.color=[0.1,0.4,0.8,1];
  body.matrix=new Matrix4(bodyBase);
  body.matrix.translate(0,0,-0.40);
  body.matrix.scale(0.5,0.28,0.6);
  body.render();


  /* ---------- NECK ---------- */

  const neckJoint = new Matrix4(bodyBase);
  neckJoint.translate(0.25,0.28,0.1);

  neckJoint.rotate(40,1,0,0);

  // head turning
  neckJoint.rotate(g_headAngle,0,1,0);

  const neck1 = new Cube();
  neck1.color=[0,0.6,1,1];
  neck1.matrix=new Matrix4(neckJoint);
  neck1.matrix.translate(-0.04,0,-0.04);
  neck1.matrix.scale(0.08,0.18,0.08);
  neck1.render();


  const neck2Joint = new Matrix4(neckJoint);
  neck2Joint.translate(0,0.18,0);

  // FIX 2: smooth S-curve instead of sharp bend
  neck2Joint.rotate(-40,1,0,0);

  const neck2 = new Cube();
  neck2.color=[0,0.7,1,1];
  neck2.matrix=new Matrix4(neck2Joint);
  neck2.matrix.translate(-0.04,0,-0.04);
  neck2.matrix.scale(0.08,0.18,0.08);
  neck2.render();


  const headJoint = new Matrix4(neck2Joint);
  headJoint.translate(0,0.18,0);

  // natural bird head tilt
  headJoint.rotate(10,1,0,0);

  const head = new Cube();
  head.color=[0,0.8,0.8,1];
  head.matrix=new Matrix4(headJoint);
  head.matrix.translate(-0.06,0,-0.06);
  head.matrix.scale(0.15,0.15,0.15);
  head.render();


  /* ---------- BEAK ---------- */

const beak = new Cone();
beak.color = [1.0, 0.75, 0.15, 1];
beak.matrix = new Matrix4(headJoint);

// move to front of head
beak.matrix.translate(0.01, 0.05, 0.1);

// rotate cone to point forward
beak.matrix.rotate(90, 1, 0, 0);

// make it thin and slightly long
beak.matrix.scale(0.1, 0.25, 0.1);

beak.render();


  /* ---------- WINGS ---------- */

  function drawWing(xOffset,angle){

    const joint=new Matrix4(bodyBase);
    joint.translate(xOffset,0.13,-0.05);

    // correct flap axis
    joint.rotate(angle,0,0,1);

    const wing=new Cube();
    wing.color=[0.2,0.6,0.2,1];
    wing.matrix=new Matrix4(joint);
    if(xOffset === 0){
    // LEFT wing
    wing.matrix.translate(-0.42,-0.045,-0.14);
  } else {
    // RIGHT wing
    wing.matrix.translate(0,-0.045,-0.14);
  }
    wing.matrix.scale(0.42,0.09,0.28);
    wing.render();
  }

  drawWing(0,g_leftShoulder);
  drawWing(0.5,g_rightShoulder);


  /* ---------- TAIL BASE ---------- */

const tailBaseJoint = new Matrix4(bodyBase);

// attach to rear center of body
tailBaseJoint.translate(0.25,0.15,-0.18);

// slight upward tilt
tailBaseJoint.rotate(-20,1,0,0);

const tailBase = new Cube();
tailBase.color = [0.1,0.5,0.2,1];

tailBase.matrix = new Matrix4(tailBaseJoint);
tailBase.matrix.translate(-0.05,-0.05,-0.08);
tailBase.matrix.scale(0.1,0.1,0.16);

tailBase.render();


/* ---------- TAIL FAN ---------- */

const tailJoint = new Matrix4(tailBaseJoint);

// move to back of tail base
tailJoint.translate(0,0.05,-0.12);

// fan tilt
tailJoint.rotate(-20,1,0,0);

// animation rotation
tailJoint.rotate(g_tailAngle,0,1,0);

const featherCount = 15;
const spread = 120;

for(let i = 0; i < featherCount; i++){

  const featherJoint = new Matrix4(tailJoint);

  const angle = -spread/2 + (spread/(featherCount-1))*i;

  // FIX: vertical fan axis
  featherJoint.rotate(angle,0,0.5,1);

  // position feather root
  featherJoint.translate(0,0.1,-0.25);

  const feather = new Cube();

  if(i % 3 === 0){
    feather.color=[0.0,0.8,0.4,1];
  }
  else if(i % 3 === 1){
    feather.color=[0.0,0.6,1.0,1];
  }
  else{
    feather.color=[0.0,0.9,0.7,1];
  }

  feather.matrix=new Matrix4(featherJoint);
  feather.matrix.scale(0.06,0.8,0.04);
  feather.render();


 /* ---------- TAIL TIP ---------- */

  const tailTip = new Cone();
  tailTip.color = [0.2, 0.8, 0.4, 1]; // peacock green

  tailTip.matrix = new Matrix4(featherJoint);

  // move to end of feather
  tailTip.matrix.translate(0, 0.9, 0);

  // point upward
  tailTip.matrix.rotate(0, 1, 0, 0);

  // thin plume
  tailTip.matrix.scale(0.05, 0.2, 0.05);

  tailTip.render();
}


  /* ---------- LEGS ---------- */

  function drawLeg(xOffset, hipAngle, kneeAngle, footAngle){

    const hip = new Matrix4(bodyBase);
    hip.translate(xOffset,-0.02,-0.1);

    hip.rotate(25,1,0,0);
    hip.rotate(hipAngle,1,0,0);

    const upper = new Cube();
    upper.color=[0.9,0.8,0.2,1];
    upper.matrix=new Matrix4(hip);
    upper.matrix.translate(-0.03,-0.18,-0.03);
    upper.matrix.scale(0.06,0.3,0.06);
    upper.render();

    const knee = new Matrix4(hip);
    knee.translate(0,-0.18,0);

    knee.rotate(-40,1,0,0);
    knee.rotate(kneeAngle,1,0,0);

    const lower = new Cube();
    lower.color=[0.9,0.8,0.2,1];
    lower.matrix=new Matrix4(knee);
    lower.matrix.translate(-0.025,-0.35,-0.025);
    lower.matrix.scale(0.05,0.35,0.05);
    lower.render();

    const footJoint = new Matrix4(knee);
    footJoint.translate(0,-0.35,0);
    footJoint.rotate(footAngle,1,0,0);

    const foot = new Cube();
    foot.color=[0.8,0.6,0.2,1];
    foot.matrix=new Matrix4(footJoint);

    foot.matrix.translate(-0.07,-0.02,0.0);
    foot.matrix.scale(0.14,0.03,0.18);
    foot.render();
  }

  drawLeg(0.15,g_leftLeg,g_leftKnee,g_leftFoot);
  drawLeg(0.35,g_rightLeg,g_rightKnee,g_rightFoot);


  /* ---------- FPS ---------- */

  syncSliders();
  const duration=performance.now()-startTime;

  sendTextToHTML(
    "ms: "+Math.floor(duration)+" fps: "+Math.floor(1000/duration),
    "numdot"
  );
}

function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm){
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}
