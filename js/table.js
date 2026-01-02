
function updateUrl() {
  const params = new URLSearchParams(window.location.search);

  const select = document.getElementById('date-select');
  if (select.value === "") {
	  params.delete('date');
  } else {
	  params.set('date', select.value);
  }

  const format = document.getElementById('result-format');
  if (format.value === "") {
	  params.delete('format');
  } else {
	  params.set('format', format.value);
  }

  const metrics = document.getElementById('result-metrics');
  if (metrics.value === "") {
	  params.delete('metrics');
  } else {
	  params.set('metrics', metrics.value);
  }

  // 更新したクエリでリダイレクト
  window.location.href = window.location.pathname + "?" + params.toString();
}


function renderMeterTableDateSelect(date, metrics, format) {
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
	if (date && (date in presets)) {
		select.value = date;
	} else {
		select.value = Object.keys(presets).sort().reverse()[0];
	}

	[[format, 'result-format'], [metrics, 'result-metrics']].forEach(([val, id]) => {
		if (val) {
			const select = document.getElementById(id);
			// 妥当な値なら選択状態にする
			if ([...select.options].some((op) => op.value === val)) {
				select.value = val;
			}
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

		const format = document.getElementById('result-format').value;
		const metrics = document.getElementById('result-metrics').value;

		// メーター数値
		['2', '4', '6'].forEach((point) => {
			const meterCell = document.createElement('td');
			const val = presets[ymd][rank][point];
			meterCell.textContent = window.scoreOrCoin(val, metrics, format);
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

	const title = document.getElementById('livescore-table-title');
	title.textContent = `ライブスコアを降順に整列 (${ymd.slice(0,4)}/${ymd.slice(4,6)}/${ymd.slice(6,8)} ver)`;

	// データを全部並べる
	const results = Object.entries(presets[ymd])
		.flatMap(([rank, data]) =>
			Object.entries(data).map(([point, meter]) => [
				rank,
				'+' + point,
				window.scoreOrCoin(meter, 'score', 'raw'),
				window.scoreOrCoin(meter, 'score', 'short'),
				window.scoreOrCoin(meter, 'coin', 'comma')
			])).sort((a, b) => b[2] - a[2]);

	const tableBody = document.getElementById('livescore-tbody');
	tableBody.innerHTML = '';

	// データを半分に分割して表示
	for (let i = 0; i < Math.ceil(results.length / 2); i++) {
		const row = document.createElement('tr');

		// ランク名
		[results[i][0], results[i][1], results[i][3], results[i][4]].forEach((val) => {
			const cell = document.createElement('td');
			cell.textContent = val;
			row.appendChild(cell);
		});

		// 空行 (区切り)
		const sep = document.createElement('td');
		sep.className = 'sep';
		row.appendChild(sep);

		// 2列目
		const j = i + Math.ceil(results.length / 2);
		if (j < results.length) {
			[results[j][0], results[j][1], results[j][3], results[j][4]].forEach((val) => {
				const cell = document.createElement('td');
				cell.textContent = val;
				row.appendChild(cell);
			});
		}

		tableBody.appendChild(row);
	}

}

// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  const params = new URLSearchParams(window.location.search);
  renderMeterTableDateSelect(
	  params.get('date') || '',
	  params.get('metrics') || '',
	  params.get('format') || '');
  renderMeterTableForDate();  // 初期表示
  renderLiveScoreTable();

  document.getElementById('date-select').addEventListener('change', updateUrl);
  document.getElementById('result-format').addEventListener('change', updateUrl);
  document.getElementById('result-metrics').addEventListener('change', updateUrl);
});
