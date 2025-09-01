// history.html 用



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

function _scoreOrCoinHistory(val, format, useRaw) {
    if (format == 'coin') {
        val = score2coin(val);
    }
    if (!useRaw) {
        val = formatPalmu(val);
    }
    return val;
}


// preset を出力 (for 履歴 history.html)
// 保証ボーダーの履歴
function renderBorderHistory() {
  const tbody = document.getElementById("history-tbody");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = ""; // 一旦クリア

  const rank = selectedRank();

  const sortedDates = Object.keys(presets).sort().reverse();
  // score or coin のフォーマットを取得
  const format = document.getElementById("result-format").value;

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

    // 値セル（A1とB3の 2/4/6）
    [2, 4, 6].forEach(point => {
      const val = a1[point];
      const td = document.createElement("td");
      if (i + 1 < sortedDates.length &&
          presets[sortedDates[i + 1]][rank] &&
          presets[sortedDates[i + 1]][rank][point] &&
          val < presets[sortedDates[i + 1]][rank][point]) {
          td.className = 'decrease';
      }

      td.textContent = _scoreOrCoinHistory(val, format, false);
      // td.textContent = val.toLocaleString();
      tr.appendChild(td);
    });

    [a1[4]/a1[2], a1[6]/a1[2]].forEach(val => {
      const td = document.createElement("td");
      // 小数第2位まで表示
      td.textContent = val.toFixed(2);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }
}

let chartInstanceHistory = null;


function renderHistoryGraph() {
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

	if (chartInstanceHistory) {
		chartInstanceHistory.destroy(); // 既存のチャートを破棄
	}


	// 辞書 presets のキーを昇順にソート
	const rank = selectedRank();

	const labels = [];
	const datas = {2: [], 4: [], 6: []};

    const format = document.getElementById("result-format").value;
	for (const date of Object.keys(presets).sort()) {
		const gd = presets[date][rank];
		if (gd) {
			labels.push(date);
			[2, 4, 6].forEach(point => {
				datas[point].push(_scoreOrCoinHistory(gd[point], format, true) || 0);
			});
		}
	}

	let name = '保証ボーダー';
	if (format == 'coin') {
		name = 'コイン相当';
	}

	const borderDates = getSeparatorDatesFromTable(); // ← ここで separator 日付取得

	chartInstanceHistory = new Chart(ctx, {
		'type': 'line',
		'data': {
			'labels': labels,
			'datasets': [
				{
					label: "+2",
					data: datas[2],
					borderColor: 'blue',
				},
				{
					label: "+4",
					data: datas[4],
					borderColor: 'green',
				},
				{
					label: "+6",
					data: datas[6],
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
			plugins: {
				title: {
					display: true,
					text: `${name}履歴 (${rank})`,
				},
			},
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

function renderHistories() {
	renderBorderHistory();
	renderHistoryGraph();
}

window.addEventListener("DOMContentLoaded", () => {
	renderHistories();
	renderNavis("navi_func", "navi_rank", "footer");
	setRankText(selectedRank(), "history_rank", "ランク", "の");

    ['result-format'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderHistories, undefined);
    });

	setupTooltips()
});
