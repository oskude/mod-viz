import { ResponsiveCanvas } from "./responsive-canvas.js";

class DotRendererShader extends ResponsiveCanvas
{
	constructor ()
	{
		super();
		this._gl = this.canvas.getContext("webgl", {
			// with this vec4(1.0, 1.0, 1.0, 0.0) is 100% transparent
			// does not work on old safari... and anyway, we would need to set background color of element...
			/*
			premultipliedAlpha: false
			*/
		});
		this._then = 0;
		this._time = 0;
		this._requestId = undefined;
		this.numChannels = 4;
		this.numNotes = 4;
		this.numColors = 4;

		// live values, index is channel
		this.notes = [0.0, 1.0, 2.0, 3.0];
		this.volumes = [0.25, 0.5, 0.75, 1.0];
		this.instruments = [3, 2, 1, 0];

		this.instColors = new Float32Array(4 * 3);
		this.instColorMap = new Float32Array(4);
	}

	connectedCallback ()
	{
		this._loadVertexShader(`
			attribute vec4 a_position;
			void main() {
				gl_Position = a_position;
			}
		`);

		this._loadFragmentShader(`
			void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
				fragColor = vec4(1, 0, 0.5, 1);
			}
		`);

		this._loadShaderProgram();
		this._init();
	}

	_init ()
	{
		this._positionAttributeLocation = this._gl.getAttribLocation(this._shaderProgram, "a_position");
		this._resolutionLocation = this._gl.getUniformLocation(this._shaderProgram, "iResolution");
		this._timeLocation = this._gl.getUniformLocation(this._shaderProgram, "iTime");
		this._notesLoc = this._gl.getUniformLocation(this._shaderProgram, "iNotes");
		this._volumesLoc = this._gl.getUniformLocation(this._shaderProgram, "iVolumes");
		this._instColorMapLoc = this._gl.getUniformLocation(this._shaderProgram, "iInstColorMap");
		this._instColorsLoc = this._gl.getUniformLocation(this._shaderProgram, "iInstColors");
		this._instrumentsLoc = this._gl.getUniformLocation(this._shaderProgram, "iInstruments");
		this._positionBuffer = this._gl.createBuffer();

		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._positionBuffer);

		this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array([
			-1, -1,
			1, -1,
			-1, 1,
			-1, 1,
			1, -1,
			1,  1,
		]), this._gl.STATIC_DRAW);
	}

	_render(now) {
		this._requestId = undefined;
		now *= 0.001;
		const elapsedTime = Math.min(now - this._then, 0.1);
		this._time += elapsedTime;
		this._then = now;

		this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
		this._gl.useProgram(this._shaderProgram);
		this._gl.enableVertexAttribArray(this._positionAttributeLocation);
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._positionBuffer);

		this._gl.vertexAttribPointer(this._positionAttributeLocation, 2, this._gl.FLOAT, false, 0, 0);

		this._gl.uniform2f(this._resolutionLocation, this._gl.canvas.width, this._gl.canvas.height);
		this._gl.uniform1f(this._timeLocation, this._time);

		this._gl.uniform1fv(this._notesLoc, this.notes);
		this._gl.uniform1fv(this._volumesLoc, this.volumes);
		this._gl.uniform1iv(this._instrumentsLoc, this.instruments);

		this._gl.uniform1iv(this._instColorMapLoc, this.instColorMap);
		this._gl.uniform3fv(this._instColorsLoc, this.instColors);

		this._gl.drawArrays(this._gl.TRIANGLES, 0, 6);

		this._requestFrame();
	}

	_requestFrame() {
		if (!this._requestId) {
			this._requestId = requestAnimationFrame(this._render.bind(this));
		}
	}

	_cancelFrame() {
		if (this._requestId) {
			cancelAnimationFrame(this._requestId);
			this._requestId = undefined;
		}
	}

	_createShader(gl, type, source) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (success) {
			return shader;
		}
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}

	_createShaderProgram(gl, vertexShader, fragmentShader) {
		var program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		var success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (success) {
			return program;
		}
		console.log(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
	}

	_loadVertexShader (vert)
	{
		this._vertexShader = this._createShader(this._gl, this._gl.VERTEX_SHADER, vert);
	}

	_loadFragmentShader (frag)
	{
		if (frag) {
			this.userFrag = frag;
		}
		let shader = `
			precision highp float;
			uniform vec2 iResolution;
			uniform float iTime;
			const int iNumChannels = ${this.numChannels};
			const int iNumNotes = ${this.numNotes};
			uniform float iNotes[${this.numChannels}];
			uniform float iVolumes[${this.numChannels}];
			uniform int iInstruments[${this.numChannels}];
			uniform vec3 iInstColors[${this.numColors * 3}];
			uniform int iInstColorMap[${this.numColors}];
			const int iNumColors = ${this.numColors};
			${this.userFrag }
			void main() {
				mainImage(gl_FragColor, gl_FragCoord.xy);
			}
		`;
		this._fragmentShader = this._createShader(this._gl, this._gl.FRAGMENT_SHADER, shader);
	}

	_loadShaderProgram ()
	{
		this._shaderProgram = this._createShaderProgram(this._gl, this._vertexShader, this._fragmentShader);
	}

	static get observedAttributes ()
	{
		return [
			"src",
		];
	}

	get src ()
	{
		return this.getAttribute("src");
	}

	set src (src)
	{
		if (src != this.src) {
			this.setAttribute("src", src);
		}
		fetch(src).then(res=>res.text()).then(data=>{
			this._loadFragmentShader(data);
			this._loadShaderProgram();
			this._init();
		});
	}

	attributeChangedCallback (name, oldVal, newVal)
	{
		switch(name){
			case "src": this.src = newVal; break;
		}
	}

	reset ()
	{
		this._time = 0;
	}

	resume ()
	{
		this._requestFrame();
	}

	suspend ()
	{
		this._cancelFrame();
	}

	updateDots (data)
	{
		for (let i = 0; i < data.notes.length; i++) {
			let note = data.notes[i];
			if (note > 0 && note < 255) {
				this.notes[i] = note - this._noteMin;
			}
		}
		this.volumes = data.volumes;
		this.instruments = data.instruments;
	}

	setNoteRange (min, max)
	{
		this._noteMin = min
		this._noteMax = max
		this.numNotes = (max - min) + 1
		this.notes = new Float32Array(this.numNotes);
		this._loadFragmentShader();
		this._loadShaderProgram();
		this._init();
	}

	setInstrumentColors (colors, instMap)
	{
		this.numColors = instMap.length;
		this.instColors = new Float32Array(colors);
		this.instColorMap = new Float32Array(instMap);
		this._loadFragmentShader();
		this._loadShaderProgram();
		this._init();
	}
}

customElements.define("dot-renderer-shader", DotRendererShader);
