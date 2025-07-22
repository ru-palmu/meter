function renderHistoryGraph() {
	const ctx = document.getElementById('chart-history').getContext('2d');
	if (!ctx) {
		return;
	}

	// 辞書 presets のキーを昇順にソート
	const rank = selectedRank();

	const labels = [];
	const data2 = [];
	const data4 = [];
	const data6 = [];

	for (const date of Object.keys(presets).sort()) {
		const gd = presets[date][rank];
		if (gd) {
			labels.push(date);
			data2.push(gd[2] || 0);
			data4.push(gd[4] || 0);
			data6.push(gd[6] || 0);
		}
	}

	new Chart(ctx, {
		'type': 'line',
		'data': {
			'labels': labels,
			'datasets': [
				{
					label: "+2",
					data: data2,
					borderColor: 'blue',
				},
				{
					label: "+4",
					data: data4,
					borderColor: 'green',
				},
				{
					label: "+6",
					data: data6,
					borderColor: 'red',
				},
			],
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,

				}
			},
			title: {
				display: true,
				text: `確定値の履歴 (${rank})`,
			},
		}
	});
}


renderHistoryGraph();
