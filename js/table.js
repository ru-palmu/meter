

function renderMeterTableDateSelect() {
	// date-select
	const select = document.getElementById('date-select');
    for (const ymd of Object.keys(presets).sort().reverse()) {
        const formatted = `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
        const op = document.createElement('option');
        op.value = ymd;
        op.textContent = formatted;
        select.appendChild(op);
    }

	// 最新のものを選択状態にする
	select.value = Object.keys(presets).sort().reverse()[0];

	document.addEventListener('change', (event) => {
		if (event.target && event.target.id === 'date-select') {
			const selectedDate = event.target.value;
			renderMeterTableForDate(selectedDate);
			renderLiveScoreTable(selectedDate);
		}
	});
}

function renderMeterTableForDate(ymd = '') {
	// ymd が妥当でなかったら，最新のものを採用する
	if (!ymd || !(ymd in presets)) {
		// 初期表示
		const select = document.getElementById('date-select');
		ymd = select.value = Object.keys(presets).sort().reverse()[0];
	}

	const tableBody = document.getElementById('meter-tbody');
	tableBody.innerHTML = '';

	// ランクごとに
	cand_rank.toReversed().forEach((rank) => {

		if (!(rank in presets[ymd])) {
			// データがなければスキップ
			return;
		}

		const row = document.createElement('tr');

		// ランク名
		const rankCell = document.createElement('td');
		rankCell.textContent = rank;
		row.appendChild(rankCell);

		// メーター数値
		['2', '4', '6'].forEach((point) => {
			const meterCell = document.createElement('td');
			meterCell.textContent = formatPalmu(presets[ymd][rank][point]);
			row.appendChild(meterCell);
		});

		tableBody.appendChild(row);

	});


}

function renderLiveScoreTable(ymd = '') {
	// ymd が妥当でなかったら，最新のものを採用する
	if (!ymd || !(ymd in presets)) {
		// 初期表示
		const select = document.getElementById('date-select');
		ymd = select.value = Object.keys(presets).sort().reverse()[0];
	}

	// データを全部並べる
	const results = Object.entries(presets[ymd])
		.flatMap(([rank, data]) =>
			Object.entries(data).map(([point, meter]) => [
				rank,
				point,
				meter,
			])).sort((a, b) => b[2] - a[2]);

	const tableBody = document.getElementById('livescore-tbody');
	tableBody.innerHTML = '';

	results.forEach(([rank, point, meter]) => {

		const row = document.createElement('tr');

		// ランク名
		const rankCell = document.createElement('td');
		rankCell.textContent = rank;
		row.appendChild(rankCell);

		// 確定ポイント
		const pointCell = document.createElement('td');
		pointCell.textContent = `+${point}`;
		row.appendChild(pointCell);

		// メーター数値
		const meterCell = document.createElement('td');
		meterCell.textContent = formatPalmu(meter);
		row.appendChild(meterCell);

		tableBody.appendChild(row);
	});

}

// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  renderMeterTableDateSelect();
  renderMeterTableForDate();  // 初期表示
  renderLiveScoreTable();
});
