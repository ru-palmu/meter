// 本体:
// ライブスコアから確定スコアまでのコイン数算出 or
// プラン計算
function calculate(rank = '') {
  if (rank instanceof Event) {
    rank = '';
  }
  // index.html
  if (document.getElementById("live_score")) {
    calculateLiveScoreToCoins(rank);
  }

  // plan.html
  if (document.getElementById("days") && typeof calculatePlans === 'function') {
    calculatePlans(rank);
  }

  if (document.getElementById("scores")) {
    setScores(rank);
  }
}

function setScores(rank = '') {
  const a = {
    2: parseInt(document.getElementById("a2").value),
    4: parseInt(document.getElementById("a4").value),
    6: parseInt(document.getElementById("a6").value)
  };

  ret = `${rank}確定スコア +2=${formatAsK(a[2])}k, +4=${formatAsK(a[4])}k, +6=${formatAsK(a[6])}k`;
  document.getElementById("scores").value = ret;
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

  let help = '現在のスコア';
  let help2 = '';

  let ret = b.toLocaleString();
  if (targets.length == 1) {
    ret += ' / ' + formatAsK(a[targets[0]]) + 'k';
    help += ' / 保証ボーダー';
    help2 += '+' + targets[0] + '=確定+' + targets[0] + 'に必要なコイン数';
  } else {
    help2 += '+2=確定+2に必要なコイン数, +4=確定+4に..., +6=確定+6に...';
  }
  ret += ' 🪙 ';

  ret += results.filter(s => s !== "").join(', ');
  // ret +=  ': ' + getCurrentTime() + '';
  document.getElementById("result").value = ret;

  document.getElementById("result-placeholder").value = help + ' 🪙 ' + help2;

}

// ランクに応じて保証ボーダーを設定する
function applyPreset(selected) {
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

  renderNavis("navi_func", "navi_rank", "footer");

  // GETパラメータ r で指定されたランクをチェックする
  key = selectedRank();

  if (document.getElementById("a2")) {
    applyPreset(key);
  }
  if (key) {

    [
      ['index_rank', 'ランク', 'での'],
//      ['history_rank', 'ランク', 'の'],
    ].forEach(([id, prefix, suffix]) => {
	  setRankText(key, id, prefix, suffix);
    });
  }

  // 入力変更時に自動計算
  ['a2', 'a4', 'a6', 'result-format', 'live_score', 'days', 'points', 'result_format'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculate, undefined);
  });

  renderGlossary();
  setupTooltips();
});

if (document.getElementById("glossary")) {
	window.addEventListener("hashchange", () => {
		hashChangeGlossary();
	});
}

