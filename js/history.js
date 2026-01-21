// history.html 用


const HISTORY_SELECTORS = [
	  ['result-format', 'format'],
	  ['result-metrics', 'metrics'],
	  ['result-basis', 'basis'],
	  ['result-end', 'end'],
	  ['result-count', 'count'],
];

function _updateUrlHistory() {
  updateUrl(HISTORY_SELECTORS);
}

// 縦線描画プラグイン, borderDates は日付の配列
function verticalLinesBetweenPlugin(borderDates) {
    return {
        id: 'verticalLineBetween',
        afterDraw(chart) {
            const ctx = chart.ctx;
            const xAxis = chart.scales['x'];
            const yAxis = chart.scales['y'];

            borderDates.forEach(date => {
                const index = chart.data.labels.indexOf(date);
                if (index <= 0) return; // 前のラベルがない場合はスキップ

                const prevX = xAxis.getPixelForTick(index - 1);
                const currX = xAxis.getPixelForTick(index);
                const x = (prevX + currX) / 2; // 中間座標

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.strokeStyle = 'rgba(255,165,0,0.5)'; // 薄いオレンジ
                ctx.lineWidth = 1;
                ctx.setLineDash([4,2]); // 破線
                ctx.stroke();
                ctx.restore();
            });
        }
    };
}


// separator 日付をテーブルから取得
function getSeparatorDatesFromTable() {
    const tbody = document.getElementById("history-tbody");
    const separators = tbody.querySelectorAll("tr.separator");
    const dates = [];

    separators.forEach(tr => {
        // 直前の行の日付セルを取得
        const dateCell = tr.querySelector("td:first-child");
        if (dateCell) {
            dates.push(dateCell.textContent.trim());
        }
    });

    return dates;
}

function _scoreOrCoinHistory(val, metrics, format) {
	return window.scoreOrCoin(val, metrics, format);
}

function borderHistoryColumns(basis) {
	if (basis === 'rank-keep') {
		return ['date', '2222211', '4221111', '4411111', '6111111', 'min'];
	} else if (basis === 'rank-up') {
		return ['date', '4422221', '4442211', '4444111', '6222221', '6422211', '6441111', '6621111'];
	} else {
		return ['date', '+2', '+4', '+6', '4/2', '6/2'];
	}
}

function reanderBorderHistoryThead(basis) {
	const thead = document.getElementById("history-thead");
	if (!thead) {
	  return;
	}

	thead.innerHTML = ""; // 一旦クリア

	const row = document.createElement("tr");
	const columns = borderHistoryColumns(basis);
	// 日付ヘッダー
	columns.forEach(col => {
		const th = document.createElement("th");
		th.textContent = col;
		row.appendChild(th);
	});
	thead.appendChild(row);
	return columns.slice(1); // 日付以外のカラム名を返す
}

function __plan2scoreOrcoin(plan, preset, metrics) {
	return [...plan].reduce((acc, ch) => {
		const score = preset[parseInt(ch)] ?? 0;
		const val = _scoreOrCoinHistory(score, metrics, "raw");
		return acc + val;
	}, 0);
}


// preset を出力 (for 履歴 history.html)
// 保証ボーダーの履歴
function __renderBorderHistory(sortedDates) {
  const tbody = document.getElementById("history-tbody");
  if (!tbody) {
    return ;
  }
  tbody.innerHTML = ""; // 一旦クリア

  const rank = selectedRank();

  // score or coin のフォーマットを取得
  const basis = document.getElementById("result-basis").value || '';
  const metrics = document.getElementById("result-metrics").value || '';
  const format = document.getElementById("result-format").value || '';

  // thead
  const plan = reanderBorderHistoryThead(basis);

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    if (!presets[date][rank]) {
      continue;
    }
    const tr = document.createElement("tr");
    if (date == "20250901") {
        // 14ランクに変更した
        tr.className = 'separator';
    }

    // 日付セル
    const dateCell = document.createElement("td");
    dateCell.textContent = date;
    dateCell.className = 'copyable';
    dateCell.addEventListener('click', () => {
        const text = dateCell.textContent.trim();
        copyHistory(text);
    });
    tr.appendChild(dateCell);

    const a1 = presets[date][rank];

    if (basis === 'rank-keep' || basis === 'rank-up') {
      // ランクキープ・ランクアップ基準
      let minv = Infinity;
	  let mintd = null;
      plan.forEach(col => {
		const td = document.createElement("td");
		let sum = 0;
		if (col === 'min') {
			sum = minv;
		} else {
			sum = __plan2scoreOrcoin(col, presets[sortedDates[i]][rank], metrics);
			if (sum < minv) {
				minv = sum;
				mintd = td;
			}
		}
		td.textContent = window.scoreToString(sum, format);
		tr.appendChild(td);
	  });
	  mintd.className = 'decrease';
    } else {
      [2, 4, 6].forEach(point => {
        const val = a1[point];
        const td = document.createElement("td");
        if (i + 1 < sortedDates.length &&
            presets[sortedDates[i + 1]][rank] &&
            presets[sortedDates[i + 1]][rank][point] &&
            val < presets[sortedDates[i + 1]][rank][point]) {
            td.className = 'decrease';
        }

        td.textContent = _scoreOrCoinHistory(val, metrics, format);
        // td.textContent = val.toLocaleString();
        tr.appendChild(td);
      });

      [a1[4]/a1[2], a1[6]/a1[2]].forEach(val => {
        const td = document.createElement("td");
        // 小数第2位まで表示
        td.textContent = val.toFixed(2);
        tr.appendChild(td);
      });
    }

    tbody.appendChild(tr);
  }
}

let chartInstanceHistory = null;

function _setChartHistorySize() {
	const canvas = document.getElementById('chart-history');
	if (!canvas) {
		console.warn("chart-history element not found");
		return;
	}
	const container = document.getElementById('chart-history-container');
	if (!container) {
		console.warn("chart-history-container element not found");
		return;
	}

	const legendHeight = 66 / 1.7 * 2.9; // 凡例の高さを考慮
	const axisHeight = 66; // 軸の高さを考慮
	const minGraphHeight = 200;

	const width = container.clientWidth;
	canvas.height = legendHeight + axisHeight + Math.min(minGraphHeight, width);
	canvas.width = width;
	// console.log(width, canvas.height);
	if (chartInstanceHistory) {
		chartInstanceHistory.resize();
		chartInstanceHistory.update();
	}
}

function __renderHistoryGraphName(basis, metrics, rank) {
	let name = '';
	if (basis === 'rank-keep') {
		name = `ランクキープ ${rank}`;
	} else if (basis === 'rank-up') {
		name = `ランクアップ ${rank}`;
	} else {
		name = '保証ボーダー';
	}

	if (metrics === 'coin') {
		name += '（コイン・改良モデル）';
	} else if (metrics === 'coin_per3') {
		name += '（コイン・÷３）';
	} else {
		name += '（スコア）';
	}

	return name
}

function __renderHistoryGraph(sortedDates) {
	const elem = document.getElementById('chart-history');
	if (!elem) {
		console.warn("chart-history element not found");
		return;
	}
	const ctx = elem.getContext('2d');
	if (!ctx) {
		console.warn("Failed to get context for chart-history");
		return;
	}

	_setChartHistorySize();

	if (chartInstanceHistory) {
		chartInstanceHistory.destroy(); // 既存のチャートを破棄
	}


	// 辞書 presets のキーを昇順にソート
	const rank = selectedRank();
	const rank_idx = RANK_DIC[rank];
	const rankdwn = rank_idx > 0 ? cand_rank[rank_idx - 1] : null;
	const rankupp = rank_idx < cand_rank.length - 1 ? cand_rank[rank_idx + 1] : null;

	const labels = [];
	const datas = {};

	const basis = document.getElementById("result-basis").value;

	// プラン. min を取り除く
	const columns = borderHistoryColumns(document.getElementById("result-basis").value).slice(1).filter(col => col !== 'min');

	const metrics = document.getElementById("result-metrics").value;
	const updown = [];
	if (basis !== 'rank-keep' && basis !== 'rank-up') {
		// 保証ボーダー. 一個上と一個下のランクも表示
		updown.push([rankdwn, 'dwn', [10, 5]]);
		updown.push([rankupp, 'upp', [5, 5]]);
		[2, 4, 6, 'dwn2', 'dwn4', 'dwn6', 'upp2', 'upp4', 'upp6'].forEach(key => {
			datas[key] = [];
		});
	} else {
		// columns のうち， min 以外
		columns.forEach(col => {
			datas[col] = [];
		});
	}

	for (const date of sortedDates) {
		const gd = presets[date][rank];
		if (!gd) {
			continue;
		}

		labels.push(date);

		if (basis === 'rank-keep' || basis === 'rank-up') {
			// ランクキープ・ランクアップ基準
			columns.forEach(col => {
				const val = __plan2scoreOrcoin(col, gd, metrics);
				datas[col].push(val || 0);
			});
		} else {
			[2, 4, 6].forEach(point => {
				datas[point].push(_scoreOrCoinHistory(gd[point], metrics, "raw") || 0);
			});

			updown.forEach(([rankKey, prefix]) => {
				// basis = 保証ボーダーのときのみ
				if (rankKey != null && presets[date][rankKey]) {
					const gd_u = presets[date][rankKey];
					[2, 4, 6].forEach(point => {
						datas[prefix + point].push(_scoreOrCoinHistory(gd_u[point], metrics, "raw") || undefined);
					});
				} else {
					[2, 4, 6].forEach(point => {
						datas[prefix + point].push(undefined);
					});
				}
			});
		}
	}

	const name = __renderHistoryGraphName(basis, metrics, rank);

	const borderDates = getSeparatorDatesFromTable(); // ← ここで separator 日付取得

	const datasets = [];
	const lines = []; // index, label, color, width, dash

	// lines を描く順序になるように，設定する
	// 'dwn', '', 'up' の順になるように設定する
	updown.forEach(([rankKey, prefix, dash]) => {
		// 保証ボーダーの場合のみ通る
		if (rankKey != null) {
			[[2, 'blue', 1, dash], [4, 'green', 1, dash], [6, 'red', 1, dash]].forEach(([point, color, width, dash]) => {
				lines.push([prefix + point, `${rankKey} +${point}`, color, width, dash]);
			});
		}

		if (prefix == 'dwn') {
			lines.push([2, `${rank} +2`, 'blue', 3, []]);
			lines.push([4, `${rank} +4`, 'green', 3, []]);
			lines.push([6, `${rank} +6`, 'red', 3, []]);
		}
	});
	if (updown.length === 0) {
		// 保証ボーダー以外
		// 色は 7 色用意しておかないといけない
		const colors = [
				"#1f77b4", // 青
				"#ff7f0e", // オレンジ
				"#2ca02c", // 緑
				"#d62728", // 赤
				"#9467bd", // 紫
				"#8c564b", // 茶
				"#e377c2", // ピンク
		];
		columns.forEach((col, i) => {
			lines.push([col, col, colors[i], 2, []]);
		});
	}

	lines.forEach(([point, label, color, width, dash]) => {
		if (datas[point].some(v => v !== undefined)) {
			datasets.push({
				label: label,
				data: datas[point],
				borderColor: color,
				borderWidth: width,
				borderDash: dash,
				hidden: (width < 2),
			});
		}
	});

	chartInstanceHistory = new Chart(ctx, {
		'type': 'line',
		'data': {
			'labels': labels,
			'datasets': datasets,
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,

				}
			},
			plugins: {
				title: {
					display: true,
					text: name,
				},
			},
			responsive: false,
		},
		plugins: [verticalLinesBetweenPlugin(borderDates)],
	});
}

function copyHistory(dateStr) {
  if (!presets[dateStr]) {
	return;
  }

  const rank = selectedRank();

  const p2 = formatPalmu(presets[dateStr][rank][2]);
  const p4 = formatPalmu(presets[dateStr][rank][4]);
  const p6 = formatPalmu(presets[dateStr][rank][6]);
  const textToCopy = `${dateStr} ${rank}確定スコア +2=${p2} +4=${p4} +6=${p6}`;

  const textarea = document.createElement("textarea");
  textarea.value = textToCopy;

  // 見えなくするためのスタイルを設定
  textarea.style.position = "fixed";  // スクロールしても位置が変わらないように
  textarea.style.left = "-9999px";    // 画面外に移動
  textarea.style.top = "0";
  textarea.style.opacity = "0";       // 透明化（念のため）
  textarea.style.pointerEvents = "none";  // 操作できないように

  document.body.appendChild(textarea);
  textarea.select();

  document.execCommand('copy');

  document.body.removeChild(textarea);
}

function __renderHistoryResultEnd() {
	const sortedDates = Object.keys(presets).sort().reverse();

	// セレクタに設定
	const select = document.getElementById("result-end");
	sortedDates.forEach(date => {
		const option = document.createElement("option");
		option.value = date;
		// YYYYMMDD を YYYY/MM/DD に変換
		option.textContent = `${date.slice(0,4)}/${date.slice(4,6)}/${date.slice(6,8)}`;
		select.appendChild(option);
	});
}

function renderHistories() {

	const sortedDates = Object.keys(presets).sort();
	// 終了日を確認
	const endDate = document.getElementById("result-end").value || sortedDates[0];
	const endIdx = sortedDates.indexOf(endDate);

	let displayDates = sortedDates;
	if (document.getElementById("result-count").value !== 'all') {

		const count = parseInt(document.getElementById("result-count").value) || 10;
		const startIdx = Math.max(0, endIdx - count + 1);

		displayDates = sortedDates.slice(startIdx, endIdx + 1);
	}
	__renderHistoryGraph(displayDates);
	// reverse() が破壊的メソッドなので，
	// <table> があと
	__renderBorderHistory(displayDates.reverse());
}

window.addEventListener("DOMContentLoaded", () => {

	__renderHistoryResultEnd();

  	const params = new URLSearchParams(window.location.search);
	HISTORY_SELECTORS.forEach(([elemId, paramName]) => {
		const val = params.get(paramName) || '';
		if (val) {
			const select = document.getElementById(elemId);
			// 妥当な値なら選択状態にする
			if ([...select.options].some((op) => op.value === val)) {
				select.value = val;
			}
		}
	});


	renderHistories();
	renderNavis("navi_func", "navi_rank", "footer");
	setRankText(selectedRank(), "history_rank", "ランク", "の");

	// 変更されたら，リダイレクトしたい
	HISTORY_SELECTORS.forEach(([id, _]) => {
      document.getElementById(id)?.addEventListener('input', _updateUrlHistory);
      document.getElementById(id)?.addEventListener('change', _updateUrlHistory);
    });

	setupTooltips()
});

window.addEventListener('resize', () => {
	_setChartHistorySize();
});

