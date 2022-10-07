import MSGTYPE from './msg_types.js';
import './dot-renderer-shader.js';

class ModPlayerWorkletNode extends AudioWorkletNode {
	constructor(audio) {
		super(audio, 'mod-player', {
			outputChannelCount : [2]
		});
	}
}

export default class ModViz extends HTMLElement {
	onModMeta () {}
	onModScan () {}
	onPlayState () {}

	constructor() {
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: flex;
					flex-grow: 1;
				}
			</style>
			<dot-renderer-shader src="note_grid.frag"></dot-renderer-shader>
		`; // TODO: remove white spaces!
		this.video = this.shadowRoot.querySelector("dot-renderer-shader");
		this.audio = new AudioContext();
		this.audio.suspend();
		this.numChannels = 0;
		this.canPlay = false;
		this.MSG_COUNT = 0;

		// TODO: what is this? old code?
		this.addEventListener("modscan", event => {
			console.log("WUT WUT");
		});

		/*
		setInterval(()=>{
			console.log("MESSAGES PER SECOND:", this.MSG_COUNT);
			this.MSG_COUNT = 0;
		}, 1000);
		*/

		this.audio.audioWorklet.addModule('mod-player.js').then(() => {
			this.node = new ModPlayerWorkletNode(this.audio);
			this.node.connect(this.audio.destination);
			this.node.port.onmessage = (event) => {
				this.MSG_COUNT++;
				switch (event.data.type) {
					case MSGTYPE.MOD_META:
						this.canPlay = event.data.data != null;
						this.onModMeta(event.data.data);
						break;
					case MSGTYPE.MOD_SCAN:
						this.numChannels = event.data.data.numChannels;
						this.video.numChannels = event.data.data.numChannels;
						this.video.setNoteRange(event.data.data.noteMin, event.data.data.noteMax);
						this.onModScan(event.data.data);
						break;
					case MSGTYPE.CHANNEL_UPDATE:
						this.video.updateDots(event.data);
						break;
					case MSGTYPE.PLAY_STATE:
						this.onPlayState(event.data);
						break;
				}
			}
		});
	}

	// TODO: this is stupid!?
	relayMessage (msg) {
		if (this?.node?.port) {
			this.node.port.postMessage(msg)
		} else {
			let lols = setInterval(()=>{
				if (this?.node?.port) {
					this.node.port.postMessage(msg)
					clearInterval(lols);
				}
			}, 100);
		}
	}

	load (input) {
		if (input instanceof File) {
			const reader = new FileReader();
			reader.onload = function() {
				this.relayMessage(reader.result);
			}.bind(this);
			reader.readAsArrayBuffer(input);
		} else {
			fetch(input).then((res)=>{
				return res.arrayBuffer();
			}).then((data)=>{
				this.relayMessage(data);
			});
		}
	}

	play () {
		this.audio.resume();
		this.video.resume();
		return true;
	}

	pause () {
		this.audio.suspend();
		this.video.suspend();
		return false;
	}

	toggle (state) {
		if (state !== undefined) {
			if (state) {
				return this.play();
			} else {
				return this.pause();
			}
		}
		if (this.audio.state == "running") {
			return this.pause();
		} else if (this.canPlay) {
			return this.play();
		}
	}

	setInstrumentColors (x) {
		let instMap = [];
		for (let inst in x) {
			instMap.push(parseInt(inst));
		}
		let colors = new Float32Array(instMap.length * 3);
		for (let i in instMap) {
			let nr = instMap[i];
			let hex = x[nr].replace("#", "");
			let bigint = parseInt(hex, 16);
			let r = ((bigint >> 16) & 255) / 255;
			let g = ((bigint >> 8) & 255) / 255;
			let b = (bigint & 255) / 255;
			let pos = i * 3;
			colors[pos+0] = r;
			colors[pos+1] = g;
			colors[pos+2] = b;
		}
		this.video.setInstrumentColors(colors, instMap);
	}
}

customElements.define("mod-viz", ModViz);
