/*
Adapted from:
    https://gpfault.net/posts/mandelbrot-webgl.txt.html
    https://github.com/ekzhang/webgl-julia-viewer
*/
class Mandelbrot {
    constructor(canvas, vshader, fshader) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
        if (!this.gl) {
            alert("Your browser or machine does not support WebGL");
            return;
        }
        this.shaderProgram = this.initShaderProgram(vshader, fshader);
        this.gl.useProgram(this.shaderProgram);

        this.u_window = [];
        this.u_center = [-0.6, 0.0];
        this.u_zoom = 2.5;

        this.mouseXY = [];
        this.panXY = [];
        this.panCenter = [];
        this.panning = false;
        this.uniforms = {
            u_window: this.gl.getUniformLocation(this.shaderProgram, "u_window"),
            u_center: this.gl.getUniformLocation(this.shaderProgram, "u_center"),
            u_zoom: this.gl.getUniformLocation(this.shaderProgram, "u_zoom"),
        };
        
        const vertices = [
            -1, 1, -1, -1, 1, -1,
            -1, 1, 1, 1, 1, -1
        ];
        this.initBuffer(vertices);
        this.resize();

        window.addEventListener("resize", this.resize.bind(this));
        this.canvas.addEventListener("wheel", this.zoom.bind(this));
        this.canvas.addEventListener("mousemove", this.updateMouseXY.bind(this));
        this.canvas.addEventListener("mousedown", this.startPan.bind(this));
        this.canvas.addEventListener("mouseup", this.stopPan.bind(this));
    }

    initShaderProgram(vsSource, fsSource) {
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);

        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            alert("Unable to initialize the shader program");
            return null;
        }
        return shaderProgram;
    }

    loadShader(type, source) {
        const shader = this.gl.createShader(type);

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert("An error occured compiling the shaders");
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffer(vertices) {
        const vertexBuffer = this.gl.createBuffer();
        const a_pos = this.gl.getAttribLocation(this.shaderProgram, "a_pos");

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        this.gl.vertexAttribPointer(a_pos, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(a_pos);
    }

    render() {
        this.gl.uniform2fv(this.uniforms.u_window, this.u_window);
        this.gl.uniform2fv(this.uniforms.u_center, this.u_center);
        this.gl.uniform1f(this.uniforms.u_zoom, this.u_zoom);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.u_window = [this.canvas.width, this.canvas.height];
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.render();
    }

    coordsToPoint(x, y) {
        x = x / this.u_window[0] - 0.5;
        y = (this.u_window[1] - 1 - y) / this.u_window[1] - 0.5;
        x *= this.u_window[0] / this.u_window[1];
        x = x * this.u_zoom + this.u_center[0];
        y = y * this.u_zoom + this.u_center[1];
        return [x, y];
    }

    updateMouseXY(e) {
        this.mouseXY = this.coordsToPoint(e.clientX, e.clientY);
        if (this.panning) {
            this.u_center[0] = this.panCenter[0] - this.mouseXY[0] + this.panXY[0];
            this.u_center[1] = this.panCenter[1] - this.mouseXY[1] + this.panXY[1];
            this.render();
        }
    }

    zoom(e) {
        const scale = Math.pow(2, e.deltaY / 1000);
        this.u_zoom *= scale;
        this.u_center[0] = scale * (this.u_center[0] - this.mouseXY[0]) + this.mouseXY[0];
        this.u_center[1] = scale * (this.u_center[1] - this.mouseXY[1]) + this.mouseXY[1];
        this.render();
    }

    startPan() {
        this.panning = true;
        this.panXY = this.mouseXY;
        this.panCenter = this.u_center;
    }

    stopPan() {
        this.panning = false;
    }
}

const vshader = `
    precision highp float;

    attribute vec2 a_pos; 

    void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
    }
`;

const fshader = `
    precision highp float;

    uniform vec2 u_window;
    uniform vec2 u_center;
    uniform float u_zoom;
    uniform bool u_color;

    void main() {
        vec2 z = vec2(0.0);
        vec2 c = ((gl_FragCoord.xy / u_window) - vec2(0.5)) * u_zoom;
        c.x *= u_window.x / u_window.y;
        c += u_center;
        float n = 0.0;
        for (int i = 0; i < 1000; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z, z) > (256.0 * 256.0)) break;
            n += 1.0;
        }
        float sn = n - log2(log2(dot(z, z))) + 4.0;
        gl_FragColor = vec4(sn / 100.0, sn / 50.0, sn / 25.0, 1.0);
    }
`;

const canvas = document.getElementById("canvas");
const mandelbrot = new Mandelbrot(canvas, vshader, fshader);