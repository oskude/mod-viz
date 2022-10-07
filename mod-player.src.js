import MSGTYPE from './msg_types.js';
import LibOpenMpt from './libopenmpt.js';
const lompt = LibOpenMpt();

class ModPlayer extends AudioWorkletProcessor
{
	bufferSize = 128; // TODO can we really not change this?
	filePtr; // TODO do we need this global?
	modPtr;
	numChannels = 0;
	currentRow = -1;
	currentNotes;
	currentVolumes;
	currentInstruments;
	currentPattern;
	skipFrames = 8;
	runnedFrames = 0;
	isPlaying = false;
	constructor ()
	{
		super();
		this.port.onmessage = (event) => {
			const data = new Uint8Array(event.data);
			this.filePtr = lompt._malloc(data.byteLength);
			lompt.HEAPU8.set(data, this.filePtr);
			this.modPtr = lompt._openmpt_module_create_from_memory2(
				this.filePtr, data.byteLength, 0, 0, 0
			);
			this.leftBufferPtr  = lompt._malloc(4 * this.bufferSize);
			this.rightBufferPtr = lompt._malloc(4 * this.bufferSize);
			const meta = this.getMeta();
			this.port.postMessage({
				type: MSGTYPE.MOD_META,
				data: meta,
			});
			this.numChannels = lompt._openmpt_module_get_num_channels(this.modPtr);
			this.currentNotes = new Uint8Array(this.numChannels);
			this.currentVolumes = new Float32Array(this.numChannels);
			this.currentInstruments = new Float32Array(128 * 3); // TODO;
			let scan = this.getScan();
			this.port.postMessage({
				type: MSGTYPE.MOD_SCAN,
				data: {
					numChannels: this.numChannels,
					...scan,
				}
			});
			this.isPlaying = true;
		}
	}
	getMeta ()
	{
		const data = {};
		const keys = lompt.UTF8ToString(lompt._openmpt_module_get_metadata_keys(this.modPtr)).split(';');
		if (keys.length <= 1) {
			return null;
		}
		let keyNameBuffer = 0;
		for (var i = 0; i < keys.length; i++) {
			keyNameBuffer = lompt._malloc(keys[i].length + 1);
			lompt.writeAsciiToMemory(keys[i], keyNameBuffer);
			data[keys[i]] = lompt.UTF8ToString(lompt._openmpt_module_get_metadata(this.modPtr, keyNameBuffer));
			lompt._free(keyNameBuffer);
		}
		return data;
	}
	getScan ()
	{
		// TODO: "render" effects to get real min/max notes? can libopenmpt do that for us?
		// TODO: scan instrument sample awerage audio frequency?
		let numOrders = lompt._openmpt_module_get_num_orders(this.modPtr);
		let out = {
			noteMin: 255,
			noteMax: 0,
			playedInstruments: [],
		}
		for (let o = 0; o < numOrders; o++) {
			let patNum = lompt._openmpt_module_get_order_pattern(this.modPtr, o);
			let numRows = lompt._openmpt_module_get_pattern_num_rows(this.modPtr, patNum);
			for (let row = 0; row < numRows; row++) {
				for (let chn = 0; chn < this.numChannels; chn++) {
					let note = lompt._openmpt_module_get_pattern_row_channel_command(
						this.modPtr, patNum, row, chn, 0
					)
					if (note === 0 || note === 255) {
						continue;
					}
					if (note < out.noteMin) {
						out.noteMin = note;
					} else if (note > out.noteMax) {
						out.noteMax = note;
					}
					let inst = lompt._openmpt_module_get_pattern_row_channel_command(
						this.modPtr, patNum, row, chn, 1
					)
					if (!out.playedInstruments.includes(inst)) {
						out.playedInstruments.push(inst)
					}
				}
			}
		}
		return out;
	}
	process (inputs, outputs, parameters)
	{
		if (!this.modPtr) {
			return false;
		}
		this.sendModAudio(outputs);
		this.postModChanges();
		return true;
	}
	postModChanges ()
	{
		let row = lompt._openmpt_module_get_current_row(this.modPtr);
		let rowChange = false;
		this.runnedFrames++;

		if (row !== this.currentRow)
		{
			rowChange = true;
			this.currentPattern = lompt._openmpt_module_get_current_pattern(this.modPtr);
		} else {
			if (this.runnedFrames < this.skipFrames) {
				return;
			} else {
				this.runnedFrames = 0;
			}
		}

		for (let chn = 0; chn < this.numChannels; chn++) {
			let volm = lompt._openmpt_module_get_current_channel_vu_mono(
				this.modPtr, chn
			);
			this.currentVolumes[chn] = volm;
			if (rowChange) {
				let note = lompt._openmpt_module_get_pattern_row_channel_command(
					this.modPtr, this.currentPattern, row, chn, 0
				)
				this.currentNotes[chn] = note;
				let inst = lompt._openmpt_module_get_pattern_row_channel_command(
					this.modPtr, this.currentPattern, row, chn, 1
				)
				if (inst > 0) {
					this.currentInstruments[chn] = inst;
				}
			}
		}

		this.currentRow = row;

		this.port.postMessage({
			type: MSGTYPE.CHANNEL_UPDATE,
			rowChange: rowChange,
			notes: this.currentNotes,
			volumes: this.currentVolumes,
			instruments: this.currentInstruments,
		});
	}
	sendModAudio (outputs)
	{
		const actualFramesPerChunk = lompt._openmpt_module_read_float_stereo(
			this.modPtr,
			48000 /*TODO*/,
			this.bufferSize,
			this.leftBufferPtr,
			this.rightBufferPtr
		);

		if (actualFramesPerChunk == 0) {
			if (this.isPlaying) {
				this.isPlaying = false;
				this.port.postMessage({
					type: MSGTYPE.PLAY_STATE,
					playEnd: true
				});
			}
			return;
		}

		const rawAudioLeft = lompt.HEAPF32.subarray(
			this.leftBufferPtr / 4, this.leftBufferPtr / 4 + actualFramesPerChunk
		);
		const rawAudioRight = lompt.HEAPF32.subarray(
			this.rightBufferPtr / 4, this.rightBufferPtr / 4 + actualFramesPerChunk
		);
		const outputL = outputs[0][0];
		const outputR = outputs[0][1];
		for (var i = 0; i < actualFramesPerChunk; ++i)
		{
			outputL[i] = rawAudioLeft[i];
			outputR[i] = rawAudioRight[i];
		}
	}
}

registerProcessor('mod-player', ModPlayer);
