export default {
	numColors: 42,
	hslToHex: function (h, s, l) {
		l /= 100;
		const a = s * Math.min(l, 1 - l) / 100;
		const f = n => {
			const k = (n + h / 30) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color).toString(16).padStart(2, '0');
		};
		return `#${f(0)}${f(8)}${f(4)}`;
	},
	create(number, method)
	{
		// TODO: idea was to have different methods to generate colors...
		const hue = (360 / this.numColors) * number;
		return this.hslToHex(hue, 50, 50);
	}
}
