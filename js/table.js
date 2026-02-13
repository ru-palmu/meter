
const TABLE_SELECTORS = [
	// [html-id, url-param]
	['date-select', 'date'],
	['date-base-select', 'base'],
	['result-format', 'format'],
	['result-metrics', 'metrics'],
];

const PLANS_KEEP = [
	"2222211",
	"4221111",
	"4411111",
	"6111111",
];

const PLANS_UP = [
	"4444111",
	"6441111",
	"4442211",
	"6621111",
	"6422211",
	"4422222",
	"6222222",
];

function _updateUrlTable() {
	return updateUrl(TABLE_SELECTORS);
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
		_createTableData(row, rank, []);

		const format = document.getElementById('result-format').value;
		const metrics = document.getElementById('result-metrics').value;

		// メーター数値
		['2', '4', '6'].forEach((point) => {
			const val = presets[ymd][rank][point];
			_createTableData(row, window.scoreOrCoin(val, metrics, format), []);
		});

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
			_createTableData(row, val, []);
		});

		// 空行 (区切り)
		const sep = document.createElement('td');
		sep.className = 'sep';
		row.appendChild(sep);

		// 2列目
		const j = i + Math.ceil(results.length / 2);
		if (j < results.length) {
			[results[j][0], results[j][1], results[j][3], results[j][4]].forEach((val) => {
				_createTableData(row, val, []);
			});
		}

		tableBody.appendChild(row);
	}

}

function _setClassRankCell(row, row2, rank) {
	const rankCell = _createTableData(row, rank, ['rank-cell']);
	rankCell.rowSpan = (row2 == null) ? 1 : 2;

	let	classRank = ''
	if (rank[0] == 'S') {
		classRank = 'rank-s';
	} else if (rank[0] == 'B') {
		classRank = 'rank-b';
	} else if (rank[0] == 'D') {
		classRank = 'rank-d';
	}
	if (classRank) {
		row.classList.add('rank-s');
		if (row2) {
			row2.classList.add('rank-s');
		}
	}
}

function __plan2scoreOrcoin(plan, preset, metrics) {
	return window.plan2scoreOrcoin(plan, preset, metrics);
}

function evalPlans(plans, preset, metrics) {
	// 最小となるプランを探す
	let minTotal = Infinity;
	let minPlan = null;
	plans.forEach((plan) => {
		const total = __plan2scoreOrcoin(plan, preset, metrics);
		if (total < minTotal) {
			minTotal = total;
			minPlan = plan;
		}
	});
	return [minTotal, minPlan];
}

// 確定値の変化
function renderBorderMultiplierTable() {
	const tableBody = document.getElementById('gborder-multiplier-tbody');
	if (!tableBody) {
		return;
	}

	const date_target = document.getElementById('date-select').value;
	const date_base = document.getElementById('date-base-select').value;

	if (date_target <= date_base) {
		// 比較日が基準日より前なら何もしない
		document.getElementById('gborder-multiplier-title').innerText = "比較日には基準日より新しい日付を選択してください。";
		return;
	}

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

	const increased = {2: [], 4: [], 6: []};
	window.getCandRank().toReversed().forEach((rank) => {

		const row = document.createElement('tr');
		row.className = 'value';

		let row2 = null;
		tableBody.appendChild(row);

		if (base[rank] && target[rank]) {
			// 比率が設定可能か
			row2 = document.createElement('tr');
			row2.className = 'multiplier';
			tableBody.appendChild(row2);

			row.classList.add('has-multiplier');
		}

		// ランク名
		_setClassRankCell(row, row2, rank);

		[2, 4, 6].forEach((point) => {
			const baseMeter = base[rank] ? base[rank][point] : null;
			const targetMeter = target[rank] ? target[rank][point] : null;
			const cname = `point-${point}`;

			_createTableData(row,
				baseMeter !== null ? window.scoreOrCoin(baseMeter, 'score', 'short') : '-',
				[cname, 'separator-left']);

			_createTableData(row,
				targetMeter !== null ? window.scoreOrCoin(targetMeter, 'score', 'short') : 'N/A',
				[targetMeter !== null ? 'target-cell' : 'na-cell', cname]);

			if (row2) {
				const percentChange  = (targetMeter - baseMeter) / baseMeter * 100;
				const percentChangeCell = _createPercentChangeCell(percentChange, increased, point, cname);
				row2.appendChild(percentChangeCell);
			}
		});
	});


	// 上位10%, 上位30%, それ以外で色分け
	_setPercentChangeClass([2, 4, 6], increased);
}

// ランクキープ・ランクアップに必要なコインの変化
function renderKeeupCoinMultiplierTable() {
	const tableBody = document.getElementById('keeupcoin-multiplier-tbody');
	if (!tableBody) {
		return;
	}

	const date_target = document.getElementById('date-select').value;
	const date_base = document.getElementById('date-base-select').value;

	if (date_target <= date_base) {
		// 比較日が基準日より前なら何もしない
		document.getElementById('keeupcoin-multiplier-title').innerText = "比較日には基準日より新しい日付を選択してください。";
		return;
	}

	document.getElementById('keeupcoin-multiplier-title').innerText = "ランクキープ・アップに必要なコイン数の変化";
	document.getElementById('keeupcoin-multiplier-subtitle').innerText =
		`(基準日: ${date_base}, 比較日: ${date_target})`;


	const base = presets[date_base];
	const target = presets[date_target];

	const increased = {'keep': [], 'up': []};
	window.getCandRank().toReversed().forEach((rank) => {

		const row = document.createElement('tr');
		row.className = 'value';

		let row2 = null;
		tableBody.appendChild(row);

		if (base[rank] && target[rank]) {
			// 比率が設定可能か
			row2 = document.createElement('tr');
			row2.className = 'multiplier';
			tableBody.appendChild(row2);

			row.classList.add('has-multiplier');
		}

		// ランク名
		_setClassRankCell(row, row2, rank);

		const format = document.getElementById('result-format').value;
		const metrics = 'coin';

		// キープ
		const keep_base = base[rank] ? evalPlans(PLANS_KEEP, base[rank], metrics, format) : ['-', '-'];
		const keep_targ = target[rank] ? evalPlans(PLANS_KEEP, target[rank], metrics, format) : ['-', '-'];
		const up_base = base[rank] ? evalPlans(PLANS_UP, base[rank], metrics, format) : ['-', '-'];
		const up_targ = target[rank] ? evalPlans(PLANS_UP, target[rank], metrics, format) : ['-', '-'];

		[[keep_base[0], keep_targ[0], keep_targ[1], 'keep'],
		 [up_base[0], up_targ[0], up_targ[1], 'up'],
		].forEach((values) => {
			const cname = values[3];
			const basecell = document.createElement('td');
			basecell.className = 'separator-left';
			if (values[0] === '-') {
				basecell.classList.add('na-cell');
				basecell.textContent = values[0];
			} else {
				basecell.textContent = window.scoreToString(values[0], format);
			}
			basecell.classList.add(cname);
			row.appendChild(basecell);

			const targetcell = document.createElement('td');
			if (values[1] === '-') {
				targetcell.textContent = values[1];
				targetcell.className = 'na-cell';
			} else {
				targetcell.textContent = window.scoreToString(values[1], format);
				targetcell.className = 'target-cell';
			}
			targetcell.classList.add(cname);
			row.appendChild(targetcell);

			_createTableData(row, values[2], [cname, 'plan-cell']);

			if (row2) {
				const percentChange  = (values[1] - values[0]) / values[0] * 100;
				const percentChangeCell = _createPercentChangeCell(percentChange, increased, values[3], cname);

				row2.appendChild(percentChangeCell);

				const nullcell = document.createElement('td')
				nullcell.className = cname;
				row2.appendChild(nullcell); // キープ・アップの区切り
			}
		});
	});

	// 上位10%, 上位30%, それ以外で色分け
	_setPercentChangeClass(['keep', 'up'], increased);
}


function _createTableData(row, text, classNames) {
	const cell = document.createElement('td');
	cell.textContent = text;
	classNames.forEach((cname) => {
		cell.classList.add(cname);
	});
	row.appendChild(cell);
	return cell;
}

function _createPercentChangeCell(percentChange, increased, key, cname) {
	const percentChangeCell = document.createElement('td');
	percentChangeCell.colSpan = 2;

	const sign = percentChange > 0 ? '+' : '';
	percentChangeCell.textContent = '(' + sign + percentChange.toFixed(1) + '%)';
	if (percentChange < 0) {
		percentChangeCell.className = 'rate-decrease';
	} else if (percentChange > 0) {
		percentChangeCell.className = 'rate-increase';
		increased[key].push([key, percentChange, percentChangeCell]);
	} else {
		percentChangeCell.className = 'rate-zero';
	}
	percentChangeCell.classList.add('separator-left');
	percentChangeCell.classList.add(cname);

	return percentChangeCell
}

function _setPercentChangeClass(args, increased) {
	args.forEach((point) => {
		increased[point].sort((a, b) => b[1] - a[1]); // 降順
		const n10 = Math.ceil(increased[point].length / 10);
		const n30 = Math.ceil(increased[point].length * 3 / 10);
		increased[point].forEach((item, index) => {
			const cell = item[2];
			if (index < n10) {
				cell.classList.add('level-3');
			} else if (index < n30) {
				cell.classList.add('level-2');
			} else {
				cell.classList.add('level-1');
			}
		});
	});
}


async function copyImage(uid) {
  const target = document.getElementById(uid);

  const canvas = await html2canvas(target, {
    scale: window.devicePixelRatio,
    backgroundColor: null,
  });

  canvas.toBlob(async (blob) => {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    alert("クリップボードにコピーしました");
  });
}

window.copyImage = copyImage;

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
  renderLiveScoreTable();
  renderBorderMultiplierTable();
  renderKeeupCoinMultiplierTable();

  ['date-select', 'date-base-select', 'result-format', 'result-metrics'].forEach((id) => {
	  document.getElementById(id)?.addEventListener('change', _updateUrlTable);
  });
});


