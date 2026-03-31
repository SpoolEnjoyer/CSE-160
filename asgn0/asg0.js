// DrawTriangle.js (c) 2012 matsuda

function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 
  //Get the rendering content for 2dCG
  var ctx = canvas.getContext('2d');
  // Get the rendering context for WebGL
  //var g1 = getWebGLContext(canvas);
  

  // Specify the color for clearing <canvas>
  //g1.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  //g1.clear(g1.COLOR_BUFFER_BIT);

  // Fill The entire canvas as black
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 400, 400);
  var v1 = new Vector3([2.25, 2.25, 0.0]);
  drawVector(v1, "red");

  function drawVector(v, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.lineTo(200 + v.elements[0] * 20, 200 + v.elements[1] * -20);
    ctx.stroke();
  }


}

