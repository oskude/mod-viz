void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	// set coordinate space to 0,0 -> 1,1 (left 0, bottom 0)
	vec2 uv = fragCoord/iResolution.xy;
	// multiply both by number of things
	uv.x *= float(iNumChannels);
	uv.y *= float(iNumNotes);

	// background color
	vec4 col = vec4(0.0, 0.0, 0.0, 1.0);

	// draw note "dots"
	float x = mod(uv.x, 1.0);
	float y = mod(uv.y, 1.0);
	int chn_pos_x = int(uv.x);
	int chn_inst;
	// TODO: for loops are cause https://www.john-smith.me/hassles-with-array-access-in-webgl-and-a-couple-of-workarounds.html
	for (int chn = 0; chn < iNumChannels; chn++) {
		if (chn_pos_x == chn) {
			float y1 = iNotes[chn];
			float y2 = y1 + 1.0;
			if (uv.y > y1 && uv.y < y2) {
				//col = vec4(0.0, 1.0, 0.0, iVolumes[chn]);
				// here we go again...
				chn_inst = iInstruments[chn];
				for (int chn_instX = 0; chn_instX < 128; chn_instX++) {
					if (chn_instX == chn_inst) {
						// i really hate you "Index expression must be constant"
						// i wonder how much slower all these for loops make...
						for (int colIdx = 0; colIdx < iNumColors; colIdx++) {
							if (chn_instX == iInstColorMap[colIdx]) {
								col = vec4(iInstColors[colIdx] * iVolumes[chn], 1.0);
								break;
							}
						}
						break;
					}
				}
			}
			break;
		}
	}

	fragColor = col;
}
