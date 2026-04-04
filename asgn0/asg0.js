// Robert Schmidling
// rschmidl@ucsc.edu
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

  var draw_button = document.getElementById("drawVectors");
  draw_button.addEventListener('click', handleDrawEvent);

  var draw_operation = document.getElementById("drawOperation");
  draw_operation.addEventListener('click', handleDrawOperationEvent);
  
  var v1;
  var v2;
  var v3;
  var v4;

  function drawVector(v, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.lineTo(200 + v.elements[0] * 20, 200 + v.elements[1] * -20);
    ctx.stroke();
  }

  function handleDrawEvent(){
    clearCanvas();
    let x1 = document.getElementById("x1").value;
    let y1 = document.getElementById("y1").value;
    v1 = new Vector3([x1, y1, 0]);
    let x2 = document.getElementById("x2").value;
    let y2 = document.getElementById("y2").value;
    v2 = new Vector3([x2, y2, 0]);
    drawVector(v1, "red");
    drawVector(v2, "blue");
  }

  function handleDrawOperationEvent(){
    handleDrawEvent();
    let operation = document.getElementById("operations").value;
    let scalar = document.getElementById("scalar").value;
    switch (operation){
      case "add" : 
      v3 = v1;
      v3.add(v2);
      drawVector(v3, "green");
        break;
      case "subtract" :
        v3 = v1;
        v3.sub(v2);
        drawVector(v3, "green");
        break;
      case "multiply" :
        v3 = v1;
        v3.mul(scalar);
        v4 = v2;
        v4.mul(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
        break;
      case "divide" :
        drawVector(v1.div(scalar), "green");
        drawVector(v2.div(scalar), "green");
        break;
      case "angleBetween" :
        console.log("Angle:", angleBetween(v1,v2));
        break;
      case "area" :
        console.log("Area:", areaTriangle(v1,v2));
        break;
      case "magnitude" :
        console.log("Magnitude v1:", v1.magnitude());
        console.log("Magnitude v2:", v2.magnitude());
        break;
      case "normalize" :
        v3 = v1;
        v3.normalize();
        v4 = v2;
        v4.normalize();
        drawVector(v3, "green");
        drawVector(v4, "green");
        break;
    }
  }

  function angleBetween(v1, v2){
    return Math.acos(Vector3.dot(v1,v2) / (v1.magnitude() * v2.magnitude())) * (180 / Math.PI);
  }

  function areaTriangle(v1,v2){
    return  Vector3.cross(v1,v2).magnitude() / 2;
  }

  function clearCanvas(){
    ctx.clearRect(0, 0, 400, 400);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 400, 400);
  }

}

