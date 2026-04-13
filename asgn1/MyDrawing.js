
// variables to consider for input
// let g_selectedColor = [1.0, 1.0, 1.0, 1.0, 1.0];
// color [r, g, b, a]
var myDrawingStatus = false;

function myDrawing() {
    // functions
    // vertices and color
    // unit conversion 20x20 -> 400 x 400
    myDrawingStatus = true;

    // first row
    drawTriangleCustom(convertUnitToCanvas([4.0, 6.0, 7.0, 5.0, 9.0, 6.0]), [1.0, 1.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([9.0, 6.0, 11.0, 5.0, 14.0, 6.0]), [1.0, 1.0, 1.0, 1.0] );
    // paired together
    drawTriangleCustom(convertUnitToCanvas([11.0, 5.0, 9.0, 4.0, 9.0, 6.0]), [0.0, 1.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([7.0, 5.0, 9.0, 4.0, 9.0, 6.0]), [0.0, 1.0, 1.0, 1.0] );
    // second row (middle body)
    //left and right pair
    drawTriangleCustom(convertUnitToCanvas([4.0, 6.0, 2.0, 8.0, 5.0, 8.0]), [1.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([14.0, 6.0, 13.0, 8.0, 16.0, 8.0]), [1.0, 0.0, 1.0, 1.0] );
    // middle trio
    drawTriangleCustom(convertUnitToCanvas([4.0, 6.0, 6.0, 9.0, 9.0, 6.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([14.0, 6.0, 12.0, 9.0, 9.0, 6.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 9.0, 12.0, 9.0, 9.0, 6.0]), [0.0, 0.0, 0.5, 1.0] );

    //middle bottom pairs
    drawTriangleCustom(convertUnitToCanvas([2.0, 8.0, 4.0, 9.0, 5.0, 8.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([13.0, 8.0, 14.0, 9.0, 16.0, 8.0]), [0.0, 0.0, 1.0, 1.0] );
    
    drawTriangleCustom(convertUnitToCanvas([4.0, 9.0, 6.0, 9.0, 5.0, 8.0]), [0.0, 0.5, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([12.0, 9.0, 14.0, 9.0, 13.0, 8.0]), [0.0, 0.5, 1.0, 1.0] );
    
    // third row (bottom body)
    // pair entering from mid to bot
    drawTriangleCustom(convertUnitToCanvas([2.0, 8.0, 3.0, 10.0, 4.0, 9.0]), [1.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([16.0, 8.0, 15.0, 10.0, 14.0, 9.0]), [1.0, 0.0, 1.0, 1.0] );
    // pattern left to right face up face down
    drawTriangleCustom(convertUnitToCanvas([3.0, 10.0, 5.0, 10.0, 4.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([4.0, 9.0, 6.0, 9.0, 5.0, 10.0]), [1.0, 0.0, 0.0, 1.0] );
    
    drawTriangleCustom(convertUnitToCanvas([5.0, 10.0, 7.0, 10.0, 6.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 9.0, 8.0, 9.0, 7.0, 10.0]), [1.0, 0.0, 0.0, 1.0] );
    
    drawTriangleCustom(convertUnitToCanvas([7.0, 10.0, 9.0, 10.0, 8.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([8.0, 9.0, 11.0, 9.0, 9.0, 10.0]), [1.0, 0.0, 0.0, 1.0] );

    drawTriangleCustom(convertUnitToCanvas([9.0, 10.0, 11.0, 10.0, 10.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([10.0, 9.0, 12.0, 9.0, 11.0, 10.0]), [1.0, 0.0, 0.0, 1.0] );
    
    drawTriangleCustom(convertUnitToCanvas([9.0, 10.0, 11.0, 10.0, 10.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([10.0, 9.0, 12.0, 9.0, 11.0, 10.0]), [1.0, 0.0, 0.0, 1.0] );
    
    drawTriangleCustom(convertUnitToCanvas([11.0, 10.0, 13.0, 10.0, 12.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([12.0, 9.0, 14.0, 9.0, 13.0, 10.0]), [1.0, 0.0, 0.0, 1.0] );

    drawTriangleCustom(convertUnitToCanvas([13.0, 10.0, 15.0, 10.0, 14.0, 9.0]), [0.0, 0.0, 1.0, 1.0] );
    
    // initals
    // R
    // Loop around top R to the right
    drawTriangleCustom(convertUnitToCanvas([5.0, 11.0, 6.0, 10.0, 7.0, 11.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 11.0, 7.0, 11.0, 7.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 11.0, 7.0, 11.0, 7.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([7.0, 12.0, 7.0, 11.0, 8.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([7.0, 12.0, 8.0, 12.0, 7.0, 13.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 13.0, 7.0, 13.0, 7.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    
    
    //The line on the left side of the R loop
    drawTriangleCustom(convertUnitToCanvas([5.0, 11.0, 5.0, 13.0, 6.0, 11.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 11.0, 6.0, 13.0, 5.0, 13.0]), [0.0, 0.0, 1.0, 1.0] );
    
    //the line on the left side bttom of R
    drawTriangleCustom(convertUnitToCanvas([5.0, 13.0, 6.0, 13.0, 6.0, 15.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([5.0, 13.0, 5.0, 15.0, 6.0, 15.0]), [0.0, 0.0, 1.0, 1.0] );
    
    //line sticking out from the loop of R bottom right
    drawTriangleCustom(convertUnitToCanvas([6.0, 13.0, 7.0, 13.0, 8.0, 15.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([6.0, 13.0, 7.0, 15.0, 8.0, 15.0]), [0.0, 0.0, 1.0, 1.0] );

    // S
    // S upper half
    drawTriangleCustom(convertUnitToCanvas([11.0, 11.0, 13.0, 11.0, 12.0, 10.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([11.0, 11.0, 12.0, 11.0, 12.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([12.0, 11.0, 13.0, 11.0, 13.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([11.0, 11.0, 11.0, 12.0, 12.0, 12.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([11.0, 12.0, 12.0, 12.0, 12.0, 13.0]), [0.0, 0.0, 1.0, 1.0] );

    // S lower half
    drawTriangleCustom(convertUnitToCanvas([12.0, 12.0, 12.0, 13.0, 13.0, 13.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([12.0, 13.0, 13.0, 13.0, 12.0, 14.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([12.0, 14.0, 13.0, 14.0, 13.0, 13.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([11.0, 14.0, 13.0, 14.0, 12.0, 15.0]), [0.0, 0.0, 1.0, 1.0] );
    drawTriangleCustom(convertUnitToCanvas([11.0, 13.0, 11.0, 14.0, 12.0, 14.0]), [0.0, 0.0, 1.0, 1.0] );

}
function convertUnitToCanvas(unit){
    let temp = unit.slice();
    for(let i = 0; i < 6; i+=2){
        temp[i] = (temp[i]/20.0) * 2.0 - 1.0;
        temp[i+1] = 1.0 - (temp[i+1]/20.0) * 2.0;
    }
    return temp;
}


function drawTriangleCustom(vertices, color){
    var rgba = color;
    var size = 5;
    // var xy = g_points[i];
    // var rgba = g_colors[i];
    // var size = g_sizes[i];

    // Pass the position of a point to a_Position variable
    // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniform1f(u_Size, size);
    // Draw
    // var d = this.size/200.0; // Delta
    var n = 3; // The number of vertices

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    //   var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    //   if (a_Position < 0) {
    //     console.log('Failed to get the storage location of a_Position');
    //     return -1;
    //   }
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, n);
    // return n;
}

