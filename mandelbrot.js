const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});

const vshader = `
    precision highp float;

    attribute vec2 pos; 

    void main() {
        gl_Position = vec4(pos, 0.0, 1.0);
    }
`;

const fshader = `
    precision highp float;

    uniform vec2 windowDim;
    uniform vec2 zoomCenter;
    uniform float zoom;

    void main() {
        vec2 z = vec2(0.0);
        vec2 c = (gl_FragCoord.xy / windowDim - vec2(0.5)) * zoom + zoomCenter;
        float n = 0.0;
        for (int i = 0; i < 2000; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z, z) > (256.0 * 256.0)) break;
            n += 1.0;
        }
        float sn = n - log2(log2(dot(z, z))) + 4.0;
        gl_FragColor = vec4(sn / 100.0, sn / 50.0, sn / 25.0, 1.0);
    }
`;

function initShaderProgram(vsSource, fsSource) {
    const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program");
        return null;
    }
    return shaderProgram;
}

function loadShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occured compiling the shaders");
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function main() {
    if (!gl) {
        alert("Your browser or machine does not support WebGL");
        return;
    }

    let shaderProgram = initShaderProgram(vshader, fshader);
    gl.useProgram(shaderProgram);
    
    let uniforms = {
        windowDim: gl.getUniformLocation(shaderProgram, "windowDim"),
        zoomCenter: gl.getUniformLocation(shaderProgram, "zoomCenter"),
        zoom: gl.getUniformLocation(shaderProgram, "zoom")
    }

    let c = [0.285, 0.01];
    let windowDim = [800, 800];
    let zoomCenter = [-0.5, 0.0];
    let zoom = 2.5; 
    let mouseXY = [0, 0];
    
    const vertexBuffer = gl.createBuffer();
    const vertices = [
        -1, 1, -1, -1, 1, -1,
        -1, 1, 1, 1, 1, -1
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let posAttr = gl.getAttribLocation(shaderProgram, "pos");
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(posAttr);

    let t = 0.0;

    function coordsToPoint(x, y) {
        x = x / canvas.width - 0.5;
        y = (canvas.height - 1 - y) / canvas.height - 0.5;
        x = x * zoom + zoomCenter[0]; 
        y = y * zoom + zoomCenter[1];
        return [x, y];
    }
   
    canvas.addEventListener("mousemove", function(e) {
        mouseXY = coordsToPoint(e.clientX, e.clientY);
    });

    canvas.addEventListener("wheel", function(e) {
        e.preventDefault();
        let scale = Math.pow(2, e.deltaY / 2000);
        zoom *= scale;
        zoomCenter[0] = scale * (zoomCenter[0] - mouseXY[0]) + mouseXY[0];
        zoomCenter[1] = scale * (zoomCenter[1] - mouseXY[1]) + mouseXY[1];
    });

    canvas.addEventListener("mousedown", function(e) {
        zoomCenter = coordsToPoint(e.clientX, e.clientY);
    });

    document.getElementById("download").addEventListener("click", function() {
        this.href = canvas.toDataURL("image/png");
    });

    let loop = function() {
        gl.uniform2fv(uniforms.windowDim, windowDim);
        gl.uniform2fv(uniforms.zoomCenter, zoomCenter);
        gl.uniform1f(uniforms.zoom, zoom);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(loop);
        t += 1.0;
    }
    loop();
}

window.onload = main;