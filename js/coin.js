

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
}


// ライブスコアに相当するコイン数を算出する．
// ギフトの最小値が 10 のため, 1の位を切り上げ.
function score2coin(score) {
  coin = score / 3;
  return Math.ceil(coin / 10) * 10;
}

// 現在時刻取得．未使用
function _getCurrentTime() {
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
  if (document.getElementById("live_score")) {
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
  let b = parseInt(document.getElementById("live_score").value);

  if (isNaN(b) || b === 0) {
    b = 0;
  }

  const format = document.getElementById("result-format").value;
  let targets = [];
  if (format == 'all') {
    targets = [2, 4, 6];
  } else {
    targets = [parseInt(format)];
  }

  const results = targets.map(i => {
    // 残スコアから必要コイン数を算出
    const s = score2coin(a[i] - b);
    if (s < 20) {
        return '';
    }
    return `+${i}=${s.toLocaleString()}`;
  });

  let help = '(現在のスコア';
  let help2 = '';

  let ret = b.toLocaleString();
  if (targets.length == 1) {
    ret += ' / ' + formatAsK(a[targets[0]]) + 'k';
    help += ' / 保証ボーダー';
    help2 += '+' + targets[0] + '=確定+' + targets[0] + 'に必要なコイン数';
  } else {
    help2 += '+2=確定+2に必要なコイン数, +4=確定+4に必要なコイン数, +6=確定+6に必要なコイン数';
  }
  ret += ' 🪙 ';

  ret += results.filter(s => s !== "").join(', ');
  // ret +=  ': ' + getCurrentTime() + '';
  document.getElementById("result").value = ret;

  document.getElementById("result-placeholder").innerHTML = help + ' 🪙 ' + help2 + ')';

  ret = `${rank}確定スコア +2=${formatAsK(a[2])}k, +4=${formatAsK(a[4])}k, +6=${formatAsK(a[6])}k`;
  document.getElementById("scores").value = ret;
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


// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {

  // GETパラメータ r で指定されたランクをチェックする
  key = selectedRank();

  if (document.getElementById("a2")) {
    applyPreset();
  }
  if (key) {
    renderBorderHistory(key);

    [
      ['index_rank', 'ランク', 'での'],
      ['history_rank', 'ランク', 'の'],
    ].forEach(([id, prefix, suffix]) => {
      const sp = document.getElementById(id);
      if (sp) {
        sp.textContent = prefix + key + suffix;
      }
    });
  }

  // 入力変更時に自動計算
  ['a2', 'a4', 'a6', 'result-format', 'live_score', 'days', 'points'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculate, undefined);
  });
});

