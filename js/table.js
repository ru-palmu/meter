
const TABLE_SELECTORS = [
	// [html-id, url-param]
	['date-select', 'date'],
	['date-base-select', 'base'],
	['result-format', 'format'],
	['result-metrics', 'metrics'],
	['rank-group', 'rankgroup'],
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


function __renderMeterTableDateSelect(date, date_base, metrics, format, rankgroup) {
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

	[[format, 'result-format'], [metrics, 'result-metrics'], [rankgroup, 'rank-group']].forEach(([val, id]) => {
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
	const date_base = document.getElementById('date-base-select').value;
	title.textContent = `ライブスコアを降順に整列`

	const title_date = document.getElementById('livescore-table-title-date');
	title_date.textContent = `${ymd.slice(0,4)}/${ymd.slice(4,6)}/${ymd.slice(6,8)} ver`;

	if (date_base && ymd > date_base) {
		const note = document.getElementById('livescore-table-title-note');
		note.textContent = `(${date_base.slice(0,4)}/${date_base.slice(4,6)}/${date_base.slice(6,8)} と比較して高くなっていたら赤強調)`;
	}

	const rank_group = document.getElementById('rank-group');
	const candRanks = new Set(window.getCandRank(rank_group ? rank_group.value : ''));

	// データを全部並べる
	const base = presets[date_base] || {};
	const results = Object.entries(presets[ymd])
	    .filter(([rank]) => candRanks.has(rank))
		.flatMap(([rank, data]) =>
			Object.entries(data).map(([point, meter]) => [
				rank,
				'+' + point,
				window.scoreOrCoin(meter, 'score', 'raw'),
				window.scoreOrCoin(meter, 'score', 'short'),
				window.scoreOrCoin(meter, 'coin', 'comma'),
				base[rank] && base[rank][point] ? meter / base[rank][point] : 1.0,
				[],
			])).sort((a, b) => b[2] - a[2]);

	const tableBody = document.getElementById('livescore-tbody');
	tableBody.innerHTML = '';

	// 基準日と比較して高くなったもので，かつ比率が1.0より大きいものを抽出して降順に整列
	_hightlightTopsLivescoreBorder(results, 5, 6);

	const two_column = results.length > 7 * 3;

	// データを半分に分割して表示
	for (let i = 0; i < (two_column ? Math.ceil(results.length / 2) : results.length); i++) {
		const row = document.createElement('tr');

		// ランク名
		[results[i][0], results[i][1], results[i][3], results[i][4]].forEach((val, idx) => {
			const clsNames = [];
			if (idx == 3) {
				for (const cls of results[i][6]) {
					clsNames.push(cls);
				}
			}
			_createTableData(row, val, clsNames);
		});

		// 空行 (区切り)
		const sep = document.createElement('td');
		sep.className = 'sep';
		row.appendChild(sep);

		// 2列目
		const j = i + Math.ceil(results.length / 2);
		if (two_column && j < results.length) {
			[results[j][0], results[j][1], results[j][3], results[j][4]].forEach((val, idx) => {
				const clsNames = [];
				if (idx == 3) {
					for (const cls of results[i][6]) {
						clsNames.push(cls);
					}
				}
				_createTableData(row, val, clsNames);
			});
		}

		tableBody.appendChild(row);
	}

}

function _hightlightTopsLivescoreBorder(results, n, clsN) {
	const rets = [...results]
		.filter(a => a[n] > 1.0)
		.sort((a, b) => b[n] - a[n]);
	const n10 = Math.ceil(rets.length / 10);
	const n30 = Math.ceil(rets.length * 3 / 10);
	rets.forEach((item, index) => {
		item[clsN].push('increased');
		if (index < n10) {
			item[clsN].push('level-3');
		} else if (index < n30) {
			item[clsN].push('level-2');
		} else {
			item[clsN].push('level-1');
		}
	});

	const dec = [...results]
		.filter(a => a[n] < 1.0);
	dec.forEach((item) => {
		item[clsN].push('decreased');
	});

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
		// 対象日が基準日より前なら何もしない
		document.getElementById('gborder-multiplier-title').innerText = "対象日には基準日より新しい日付を選択してください。";
		return;
	}

	document.getElementById('gborder-multiplier-title').innerText = "保証ボーダーの変化";
	document.getElementById('gborder-multiplier-subtitle').innerText =
		`(基準日: ${date_base}, 対象日: ${date_target})`;


	[['base', '基準'], ['target', '対象']].forEach(([type, ymd]) => {
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
		// 対象日が基準日より前なら何もしない
		document.getElementById('keeupcoin-multiplier-title').innerText = "対象日には基準日より新しい日付を選択してください。";
		return;
	}

	document.getElementById('keeupcoin-multiplier-title').innerText = "ランクキープ・アップに必要なコイン数の変化";
	document.getElementById('keeupcoin-multiplier-subtitle').innerText =
		`(基準日: ${date_base}, 対象日: ${date_target})`;


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
	percentChangeCell.textContent = sign + percentChange.toFixed(1) + '%';
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
  __renderMeterTableDateSelect(
	  params.get('date') || '',
	  params.get('base') || '',
	  params.get('metrics') || '',
	  params.get('format') || '',
      params.get('rankgroup') || '');
  renderMeterTableForDate();  // 初期表示
  renderLiveScoreTable();
  renderBorderMultiplierTable();
  renderKeeupCoinMultiplierTable();

  TABLE_SELECTORS.forEach(([id, _]) => {
	  document.getElementById(id)?.addEventListener('change', _updateUrlTable);
  });
});


