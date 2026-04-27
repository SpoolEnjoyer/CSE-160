let g_cubeBuffer = null;
let g_cubeNormalBuffer = null;
let g_cubeInited = false;

class Cube {
    constructor() {
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }

    // =========================
    // ONE-TIME INITIALIZATION
    // =========================
    static initBuffer() {
        if (g_cubeInited) return;
        g_cubeInited = true;

        const vertices = new Float32Array([
            // Front
            0,0,0,  1,1,0,  1,0,0,
            0,0,0,  0,1,0,  1,1,0,

            // Top
            0,1,0,  0,1,1,  1,1,1,
            0,1,0,  1,1,1,  1,1,0,

            // Back
            0,0,1,  1,0,1,  1,1,1,
            0,0,1,  1,1,1,  0,1,1,

            // Left
            0,0,0,  0,0,1,  0,1,1,
            0,0,0,  0,1,1,  0,1,0,

            // Right
            1,0,0,  1,1,0,  1,1,1,
            1,0,0,  1,1,1,  1,0,1,

            // Bottom
            0,0,0,  1,0,1,  0,0,1,
            0,0,0,  1,0,0,  1,0,1
        ]);

        const normals = new Float32Array([
            // Front
            0,0,-1, 0,0,-1, 0,0,-1,
            0,0,-1, 0,0,-1, 0,0,-1,

            // Top
            0,1,0, 0,1,0, 0,1,0,
            0,1,0, 0,1,0, 0,1,0,

            // Back
            0,0,1, 0,0,1, 0,0,1,
            0,0,1, 0,0,1, 0,0,1,

            // Left
            -1,0,0, -1,0,0, -1,0,0,
            -1,0,0, -1,0,0, -1,0,0,

            // Right
            1,0,0, 1,0,0, 1,0,0,
            1,0,0, 1,0,0, 1,0,0,

            // Bottom
            0,-1,0, 0,-1,0, 0,-1,0,
            0,-1,0, 0,-1,0, 0,-1,0
        ]);

        // ===== POSITION BUFFER =====
        g_cubeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // ===== NORMAL BUFFER =====
        g_cubeNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    }

    // =========================
    // FAST RENDER (MAIN PATH)
    // =========================
    render() {
        Cube.draw(this.matrix, this.color);
    }

    // =========================
    // CORE DRAW FUNCTION
    // =========================
    static draw(M, color) {
        Cube.initBuffer();

        // ---- color ----
        gl.uniform4f(
            u_FragColor,
            color[0],
            color[1],
            color[2],
            color[3]
        );

        // compute normal matrix
        let normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(M);
        normalMatrix.transpose();

        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        
        // ---- matrix ----
        gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

        // ---- POSITION ----
        gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // ---- NORMAL (lighting preserved) ----
        gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeNormalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        
        // ---- draw ----
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
}