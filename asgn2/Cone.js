let g_coneBuffer = null;
let g_coneNormalBuffer = null;
let g_coneVertexCount = 0;
let g_coneInited = false;

class Cone {

  constructor(segments = 20){
    this.color = [1,1,1,1];
    this.matrix = new Matrix4();
    this.segments = segments;
  }

  static initBuffer(segments){

    if(g_coneInited) return;
    g_coneInited = true;

    const verts = [];
    const norms = [];

    const angleStep = 2 * Math.PI / segments;

    for(let i=0;i<segments;i++){

      const a1 = i * angleStep;
      const a2 = (i+1) * angleStep;

      const x1 = Math.cos(a1)*0.5;
      const z1 = Math.sin(a1)*0.5;

      const x2 = Math.cos(a2)*0.5;
      const z2 = Math.sin(a2)*0.5;

      const tip = [0,0.5,0];
      const p1 = [x1,-0.5,z1];
      const p2 = [x2,-0.5,z2];

      // SIDE TRIANGLE
      verts.push(
        tip[0],tip[1],tip[2],
        p1[0],p1[1],p1[2],
        p2[0],p2[1],p2[2]
      );

      const n = computeNormal(tip,p1,p2);

      for(let j=0;j<3;j++){
        norms.push(n[0],n[1],n[2]);
      }

      // BASE TRIANGLE
      verts.push(
        0,-0.5,0,
        p2[0],p2[1],p2[2],
        p1[0],p1[1],p1[2]
      );

      for(let j=0;j<3;j++){
        norms.push(0,-1,0);
      }
    }

    g_coneVertexCount = verts.length / 3;

    // POSITION BUFFER
    g_coneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);

    // NORMAL BUFFER
    g_coneNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,g_coneNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(norms),gl.STATIC_DRAW);
  }

  render(){
    Cone.draw(this.matrix,this.color,this.segments);
  }

  static draw(M,color,segments){

    Cone.initBuffer(segments);

    gl.uniform4f(u_FragColor,color[0],color[1],color[2],color[3]);

    gl.uniformMatrix4fv(u_ModelMatrix,false,M.elements);

    // NORMAL MATRIX
    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(M);
    normalMatrix.transpose();

    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    // POSITION
    gl.bindBuffer(gl.ARRAY_BUFFER,g_coneBuffer);
    gl.vertexAttribPointer(a_Position,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(a_Position);

    // NORMAL
    gl.bindBuffer(gl.ARRAY_BUFFER,g_coneNormalBuffer);
    gl.vertexAttribPointer(a_Normal,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES,0,g_coneVertexCount);
  }
}

function computeNormal(p1,p2,p3){

  const U = [
    p2[0]-p1[0],
    p2[1]-p1[1],
    p2[2]-p1[2]
  ];

  const V = [
    p3[0]-p1[0],
    p3[1]-p1[1],
    p3[2]-p1[2]
  ];

  const N = [
    U[1]*V[2] - U[2]*V[1],
    U[2]*V[0] - U[0]*V[2],
    U[0]*V[1] - U[1]*V[0]
  ];

  const len = Math.sqrt(N[0]*N[0] + N[1]*N[1] + N[2]*N[2]);

  if(len < 0.00001){
    return [0,1,0];
  }

  return [N[0]/len,N[1]/len,N[2]/len];
}