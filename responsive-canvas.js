export class ResponsiveCanvas extends HTMLElement
{
	constructor ()
	{
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: flex;
					flex-grow: 1;
				}
				canvas {
					/* we need this to allow canvas resize smaller */
					/* TODO: do not remove from doc flow? */
					position: fixed;
				}
			</style>
			<canvas></canvas>
		`;
		this.canvas = this.shadowRoot.querySelector("canvas");
		this.width = this.canvas.width = 0;
		this.height = this.canvas.height = 0;
		this.resizeObserver = new ResizeObserver((entries)=>{
			let entry = entries[0];
			this.width = this.canvas.width = Math.ceil(entry.contentRect.width);
			this.height = this.canvas.height = Math.ceil(entry.contentRect.height);
			this.resizedCallback();
		});
		this.resizeObserver.observe(this);
	}

	disconnectedCallback ()
	{
		this.resizeObserver.disconnect();
	}

	resizedCallback ()
	{
		/* can be implemented by extender */
	}
}

customElements.define("responsive-canvas", ResponsiveCanvas);
