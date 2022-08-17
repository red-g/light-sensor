<script lang="ts">
	import { onMount } from 'svelte';
	import { LayerCake, Svg } from 'layercake';
	import AxisX from '../charts/AxisX.svelte';
	import AxisY from '../charts/AxisY.svelte';
	import Column from '../charts/Column.svelte';
	import { scaleLog, scaleLinear } from 'd3-scale';

	//The maximum and minimum size of the graph
	const MIN = 1;
	const MAX = 10000;

	const site = '://localhost:3000';
	let wss: WebSocket;

	let writing: Boolean;

	type Point = { time: number; lux: number; capped: number };
	let data: Point[] = [];

	function getState() {
		fetch('http' + site + '/file/writing', { method: 'GET' })
			.then((res) => res.json())
			.then((res) => (writing = res));
	}

	function listen() {
		wss = new WebSocket('ws' + site);
		wss.onmessage = (e) => {
			const msg = JSON.parse(e.data);
			if (typeof msg === 'boolean') writing = msg;
			else {
				msg.capped = (msg.lux < MIN && MIN) || (msg.lux > MAX && MAX) || msg.lux;
				data = [...data, msg];
			}
		};
	}

	onMount(() => {
		getState();
		listen();
	});

	const setWriting = () => fetch('http' + site + '/file?writing=' + !writing, { method: 'PUT' });
	const clearFile = () => fetch('http' + site + '/file/clear', { method: 'PUT' });
	const clearGraph = () => (data = []);
</script>

<h1>Light Data</h1>
{#if data && data.length > 0}
	<div class="graphs">
		<div class="chart">
			<LayerCake
				x="time"
				y="capped"
				{data}
				xScale={scaleLinear()}
				yDomain={[MIN, MAX]}
				yScale={scaleLog()}
			>
				<Svg>
					<Column />
					<AxisX gridlines={false} />
					<AxisY gridlines={false} />
				</Svg>
			</LayerCake>
		</div>
		<div class="tracker">
			<LayerCake
				x="time"
				y="capped"
				data={[data[data.length - 1]]}
				xScale={scaleLinear()}
				yDomain={[MIN, MAX]}
				yScale={scaleLog()}
			>
				<Svg>
					<Column />
					<AxisX gridlines={false} />
					<AxisY gridlines={false} />
				</Svg>
			</LayerCake>
		</div>
	</div>
	<span>Current Value: {Math.round(data[data.length - 1].lux)} lux</span>
{/if}

<a href={'http' + site + '/file'} download="lightdata.json">Download</a>

<button on:click={setWriting}>{writing ? 'Stop' : 'Start'} writing</button>

<button on:click={clearFile}>Clear file</button>

<button on:click={clearGraph}>Clear graph</button>

<style>
	.chart {
		width: 800px;
		height: 400px;
		margin: 2em;
	}
	.tracker {
		height: 400px;
		width: 40px;
	}
	.graphs {
		display: flex;
		flex-direction: row;
	}
</style>
