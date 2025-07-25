
function _scoreOrCoinHistory(val, format) {
    if (format == 'coin') {
        val = score2coin(val);
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

  rank = selectedRank();

  const sortedDates = Object.keys(presets).sort().reverse();
  const format = document.getElementById("result-format").value;
  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    if (!presets[date][rank]) {
      continue;
    }
    const tr = document.createElement("tr");

    // 日付セル
    const dateCell = document.createElement("td");
    dateCell.textContent = date;
    tr.appendChild(dateCell);

    const a1 = presets[date][rank];

    // 値セル（A1とB3の 2/4/6）
    [2, 4, 6].forEach(point => {
      val = a1[point];
      const td = document.createElement("td");
      if (i + 1 < sortedDates.length &&
          presets[sortedDates[i + 1]][rank] &&
          presets[sortedDates[i + 1]][rank][point] &&
          val < presets[sortedDates[i + 1]][rank][point]) {
          td.className = 'decrease';
      }
      td.textContent = formatAsK(_scoreOrCoinHistory(val, format));
      // td.textContent = val.toLocaleString();
      tr.appendChild(td);
    });

    [a1[4]/a1[2], a1[6]/a1[2], a1[6]/a1[4]].forEach(val => {
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
		console.log("chart-history element not found");
		return;
	}
	const ctx = elem.getContext('2d');
	if (!ctx) {
		console.log("Failed to get context for chart-history");
		return;
	}

	if (chartInstanceHistory) {
		chartInstanceHistory.destroy(); // 既存のチャートを破棄
	}


	// 辞書 presets のキーを昇順にソート
	const rank = selectedRank();

	const labels = [];
	const data2 = [];
	const data4 = [];
	const data6 = [];

    const format = document.getElementById("result-format").value;
	for (const date of Object.keys(presets).sort()) {
		const gd = presets[date][rank];
		if (gd) {
			labels.push(date);
			data2.push(_scoreOrCoinHistory(gd[2], format) || 0);
			data4.push(_scoreOrCoinHistory(gd[4], format) || 0);
			data6.push(_scoreOrCoinHistory(gd[6], format) || 0);
		}
	}

	let name = '保証ボーダー';
	if (format == 'coin') {
		name = '確定値のコイン';
	}

	chartInstanceHistory = new Chart(ctx, {
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
			plugins: {
				title: {
					display: true,
					text: `${name}履歴 (${rank})`,
				},
			},
		}
	});
}

function renderHistories() {
	renderHistoryGraph();
	renderBorderHistory();
}

window.addEventListener("DOMContentLoaded", () => {
	renderHistories();
	renderNavis("navi_func", "navi_rank", "footer");
	setRankText(selectedRank(), "history_rank", "ランク", "の");

    ['result-format'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderHistories, undefined);
    });

});
