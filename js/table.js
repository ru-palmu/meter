
function updateUrl() {
  const params = new URLSearchParams(window.location.search);

  const select = document.getElementById('date-select');
  if (select.value === "") {
	  params.delete('date');
  } else {
	  params.set('date', select.value);
  }

  const select2 = document.getElementById('date-base-select');
  if (!select2 || select2.value === "") {
	  params.delete('base');
  } else {
	  params.set('base', select2.value);
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


function renderMeterTableDateSelect(date, date_base, metrics, format) {
	// date-select
	const select = document.getElementById('date-select');
	const select2 = document.getElementById('date-base-select');
    for (const ymd of Object.keys(presets).sort().reverse()) {
        const formatted = `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;

		[select, select2].forEach((sel) => {
			if (sel) {
				const op = document.createElement('option');
				op.value = ymd;
				op.textContent = formatted;
				sel.appendChild(op);
			}
		});
    }

	if (date && (date in presets)) {
		// GET パラメータが妥当な値なら選択状態にする
		select.value = date;
	} else {
		// 最新のものを選択状態にする
		select.value = Object.keys(presets).sort().reverse()[0];
	}
	if (select2) {
		if (date_base && (date_base in presets)) {
			// GET パラメータが妥当な値なら選択状態にする
			select2.value = date_base;
		} else {
			// select と同じ値にする
			select2.value = select.value;
		}
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

function renderMeterTableForDate() {
	const tableBody = document.getElementById('meter-tbody');
	if (!tableBody) {
		return;
	}

	// ymd が妥当でなかったら，最新のものを採用する
	let ymd = document.getElementById('date-select').value;
	if (!ymd || !(ymd in presets)) {
		// 初期表示
		const select = document.getElementById('date-select');
		ymd = select.value = Object.keys(presets).sort().reverse()[0];
	}

	tableBody.innerHTML = '';

	// ランクごとに
	window.getCandRank().toReversed().forEach((rank) => {

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

function renderMeterKeepUpTableForDate() {
	const tableBody = document.getElementById('meter-keepup-tbody');
	if (!tableBody) {
		return;
	}

	// ymd が妥当でなかったら，最新のものを採用する
	let ymd = document.getElementById('date-select').value;
	if (!ymd || !(ymd in presets)) {
		// 初期表示
		const select = document.getElementById('date-select');
		ymd = select.value = Object.keys(presets).sort().reverse()[0];
	}

	tableBody.innerHTML = '';

	// ランクごとに
	window.getCandRank().toReversed().forEach((rank) => {
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


		/////////////////////////////////
		// 何をもとにするか
		/////////////////////////////////
		const values = {};
		[2, 4, 6].forEach((point) => {
			const v = presets[ymd][rank][point];
			if (metrics === 'score') {
				values[point] = v;
			} else if (metrics === 'coin') {
				values[point] = score2coin(v, 0, 'normal');
			} else {
				values[point] = score2coin(v, 0, 'per3');
			}
		});

		/////////////////////////////////
		// キープ
		/////////////////////////////////
		[[2,2,2,2,2], [4,2,2], [4,4], [6]].forEach((plan) => {
			const val = plan.reduce((acc, point) => acc + values[point], 0);
			const meterCell = document.createElement('td');
			meterCell.textContent = window.scoreToString(val, format);
			row.appendChild(meterCell);
		});

		/////////////////////////////////
		// ランクアップ
		/////////////////////////////////
		const lists = [
			[4,4,4,4],
			[6,4,4],
			[4,4,4,2,2],
			[6,6,2],
			[6,4,2,2,2],
			[4,4,2,2,2,2,2],
			[6,2,2,2,2,2,2],
		];
		const result = lists.reduce(
		  (best, arr) => {
			const sum = arr.reduce((total, i) => total + (values[i] ?? 0), 0);

			if (sum < best.sum) {
			  return { array: arr, sum };
			}
			return best;
		  },
		  { array: null, sum: +Infinity }
		);

		const upPlan = document.createElement('td');
		upPlan.textContent = result.array ? result.array.map((p) => `+${p}`).join(', ') : '-';
		row.appendChild(upPlan);

		const upValue = document.createElement('td');
		upValue.textContent = window.scoreToString(result.sum, format);
		row.appendChild(upValue);

		tableBody.appendChild(row);
	});
}


function renderLiveScoreTable() {
	const title = document.getElementById('livescore-table-title');
	if (!title) {
		return;
	}

	// ymd が妥当でなかったら，最新のものを採用する
	// ライブスコアを降順に整列
	let ymd = document.getElementById('date-select').value;
	if (!ymd || !(ymd in presets)) {
		// 初期表示
		const select = document.getElementById('date-select');
		ymd = select.value = Object.keys(presets).sort().reverse()[0];
	}

	title.textContent = `ライブスコアを降順に整列 (${ymd.slice(0,4)}/${ymd.slice(4,6)}/${ymd.slice(6,8)} ver)`;

	const candRanks = new Set(window.getCandRank());

	// データを全部並べる
	const results = Object.entries(presets[ymd])
	    .filter(([rank]) => candRanks.has(rank))
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


// 確定値の変化
function renderBorderMultiplierTable() {
	const tableBody = document.getElementById('gborder-multiplier-tbody');
	if (!tableBody) {
		return;
	}

	const date_target = document.getElementById('date-select').value;
	const date_base = document.getElementById('date-base-select').value;

	document.getElementById('gborder-multiplier-title').innerText = "保証ボーダーの変化";
	document.getElementById('gborder-multiplier-subtitle').innerText =
		`(基準日: ${date_base}, 比較日: ${date_target})`;


	[['base', '基準'], ['target', '比較']].forEach(([type, ymd]) => {
		// const ymd_formatted = `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
		const text = ymd;
		['2', '4', '6'].forEach((point) => {
			const th = document.getElementById(`gborder-multiplier-th-${type}${point}`);
			th.textContent = text;
		});
	});

	const base = presets[date_base];
	const target = presets[date_target];

	window.getCandRank().toReversed().forEach((rank) => {

		const row = document.createElement('tr');
		row.className = 'value';

		let row2 = null;
		let rowspan = 1;
		tableBody.appendChild(row);

		if (base[rank] && target[rank]) {
			// 比率が設定可能か
			rowspan += 1;
			row2 = document.createElement('tr');
			row2.className = 'multiplier';
			tableBody.appendChild(row2);

			row.classList.add('has-multiplier');
		}

		// ランク名
		const rankCell = document.createElement('td');
		rankCell.textContent = rank;
		rankCell.rowSpan = rowspan;
		rankCell.className = 'rank-cell';
		row.appendChild(rankCell);

		[2, 4, 6].forEach((point) => {
			const baseMeter = base[rank] ? base[rank][point] : null;
			const targetMeter = target[rank] ? target[rank][point] : null;

			const baseCell = document.createElement('td');
			baseCell.textContent = baseMeter !== null ? window.scoreOrCoin(baseMeter, 'score', 'short') : '-';
			row.appendChild(baseCell);

			const targetCell = document.createElement('td');
			targetCell.textContent = targetMeter !== null ? window.scoreOrCoin(targetMeter, 'score', 'short') : 'N/A';
			row.appendChild(targetCell);

			if (row2) {
				const percentChange  = (targetMeter - baseMeter) / baseMeter * 100;
				const percentChangeCell = document.createElement('td');
				percentChangeCell.colSpan = 2;

				const sign = percentChange > 0 ? '+' : '';
				percentChangeCell.textContent = '(' + sign + percentChange.toFixed(1) + '%)';
				if (percentChange < 0) {
					percentChangeCell.className = 'rate-decrease';
				} else {
					percentChangeCell.className = 'rate-increase';
				}

				row2.appendChild(percentChangeCell);
			}
		});
	});



}

// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  const params = new URLSearchParams(window.location.search);
  renderMeterTableDateSelect(
	  params.get('date') || '',
	  params.get('base') || '',
	  params.get('metrics') || '',
	  params.get('format') || '');
  renderMeterTableForDate();  // 初期表示
  renderMeterKeepUpTableForDate();  // 初期表示
  renderLiveScoreTable();
  renderBorderMultiplierTable();

  ['date-select', 'date-base-select', 'result-format', 'result-metrics'].forEach((id) => {
	  document.getElementById(id)?.addEventListener('change', updateUrl);
  });
});
