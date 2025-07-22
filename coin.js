
const cand_rank = ["B1", "B2", "B3", "A1", "A2", "A3", "S"];


// preset から最新の日付を取得
const latestDate = Object.keys(presets).sort().reverse()[0];

// ランクの一覧
function renderLinks(selected_rank) {
  const container = document.getElementById("target_link");
  container.innerHTML = ""; // クリア

  const available = presets[latestDate];

  const ul = document.createElement("ul");
  ul.className = "tab-nav";

  cand_rank.forEach(rank => {
    if (available && available[rank]) {
      const li = document.createElement("li");
      if (rank === selected_rank) {
        li.className = "active";
      }
      const a = document.createElement("a");
      a.href = `?r=${rank}`;
      a.textContent = rank;
      li.appendChild(a);
      ul.appendChild(li)
    }
  });
  container.appendChild(ul);
}

// キロ表示
function formatAsK(value) {
  if (value < 100000) {
    return (Math.floor(value / 100) / 10).toFixed(1);  // 小数第1位（切り捨て）
  } else {
    return Math.floor(value / 1000);      // 整数（千単位）
  }
}

// preset を出力 (for 履歴 history.html)
function renderBorderHistory(rank) {
  const tbody = document.getElementById("history");
  if (!tbody) {
    return;
  }
  tbody.innerHTML = ""; // 一旦クリア

  const sortedDates = Object.keys(presets).sort().reverse();
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
	  td.textContent = formatAsK(val);
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

  const rankH3 = document.getElementById("history_rank");
  if (rankH3) {
    rankH3.innerHTML = ': ' + rank;
  }
}


// 1の位を切り上げ
function roundUpToNearest10(n) {
  return Math.ceil(n / 10) * 10;
}


// 現在時刻取得．未使用
function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}


// 本体:
// ライブスコアから確定スコアまでのコイン数算出 or
// プラン計算
function calculate(rank = '') {
    if (rank instanceof Event) {
        rank = '';
    }
    if (document.getElementById("b")) {
        calculateLiveScoreToCoins(rank);
    }

    if (document.getElementById("days")) {
        calculatePlans(rank);
    }
}


// 現在のライブスコアから確定スコアまでのコイン数を算出
function calculateLiveScoreToCoins(rank = '') {
  const a = {
    2: parseInt(document.getElementById("a2").value),
    4: parseInt(document.getElementById("a4").value),
    6: parseInt(document.getElementById("a6").value)
  };
  let b = parseInt(document.getElementById("b").value);

  if (isNaN(b) || b === 0) {
    b = 0;
  }

  const results = [2, 4, 6].map(i => {
    // 残スコアから必要コイン数を算出
    const s = roundUpToNearest10((a[i] - b) / 3);
    if (s < 20) {
        return '';
    }
    return `+${i}=${s.toLocaleString()}`;
  });

  ret = b.toLocaleString() + ' 🪙 ';
  ret += results.filter(s => s !== "").join(', ');
  // ret +=  ': ' + getCurrentTime() + '';
  document.getElementById("result").value = ret;


  ret = `${rank}確定スコア +2=${formatAsK(a[2])}k, +4=${formatAsK(a[4])}k, +6=${formatAsK(a[6])}k`;
  document.getElementById("scores").value = ret;
}

function selectedRank() {
  const radios = document.getElementsByName("rank");
  const presetFromURL = getQueryParam("r");
  let key = default_rank;
  if (presetFromURL && presets[latestDate][presetFromURL]) {
    key = presetFromURL;
  }
  return key;
}

// ランクを選んだときの処理
function applyPreset() {
  const selected = selectedRank();

  if (selected && presets[latestDate] && presets[latestDate][selected]) {
    const p = presets[latestDate][selected];
    document.getElementById("a2").value = p[2];
    document.getElementById("a4").value = p[4];
    document.getElementById("a6").value = p[6];
    calculate(selected);
  }

}


// コピーボタン
function copyResult(name) {
  const textarea = document.getElementById(name);
  textarea.select();

  try {
    document.execCommand('copy');
  } catch (err) {
    alert("コピーに失敗しました: " + err);
  }

  textarea.setSelectionRange(0, 0); // 選択解除
}


function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {

  // GETパラメータ r で指定されたランクをチェックする
  key = selectedRank();

  if (document.getElementById("a2")) {
    applyPreset();
  }
  if (key) {
    renderBorderHistory(key);

	if (document.getElementById("index_rank")) {
	  document.getElementById("index_rank").textContent = 'ランク' + key + 'での';
	}
  }
  renderLinks(key);


  // 入力変更時に自動計算
  ['a2', 'a4', 'a6', 'b', 'days', 'points'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculate, undefined);
  });

});

