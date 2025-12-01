// 本体:
// ライブスコアから確定スコアまでのコイン数算出 or
// プラン計算
//
const METER_PREFIX = 'meter_meter_';

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

  const ret = `${rank}確定スコア +2=${formatAsK(a[2])}k, +4=${formatAsK(a[4])}k, +6=${formatAsK(a[6])}k`;
  document.getElementById("scores").value = ret;
}

// 出力形式を保存する
function _saveMeterArgs(format) {
	const table = [
		['format', format],
	];
	saveSessionArgs(METER_PREFIX, table);
}

function loadDefaultMeter() {
	const table = [
		['format', 'result-format'],
	];
	loadDefaultValues(METER_PREFIX, table);
}

// 現在のライブスコアから確定スコアまでのコイン数を算出
function calculateLiveScoreToCoins(__rank = '') {

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
  _saveMeterArgs(format);
  let targets = [];
  if (format == 'all' || format.startsWith('easy')) {
    targets = [2, 4, 6];
  } else if (format.endsWith('x')) {
	  // 2x, 4x, 6x
    targets = [parseInt(format[0])];
  } else {
	  // 2, 4, 6
    targets = [parseInt(format)];
  }

  const s2calgo = format.endsWith('_per3') ? 'per3' : 'normal';

  const results = targets.map(i => {
    // 残スコアから必要コイン数を算出
    const s = score2coin(a[i], b, s2calgo);
    if (s < 20) {
        return '';
    }
	if (format.startsWith('easy')) {
	    return `${s.toLocaleString()}コインで+${i}確定`;
	} else if (format.endsWith('x')) {
	    return s;
	} else {
	    return `+${i}=${s.toLocaleString()}`;
	}
  });

  let help = '現在のスコア';
  let help2 = '';

  let ret = b.toLocaleString();
  let is_hitokoto_comment = false;
  if (format.endsWith('x')) {
	// 2x, 4x, 6x
    ret = b + '→🪙';
    is_hitokoto_comment = true;
    help += '→🪙';
    help2 += '+' + targets[0] + 'に必要なコイン数';
  } else if (targets.length == 1) {
	// +2, +4, +6 のみ
    ret += ' / ' + formatAsK(a[targets[0]]) + 'k';
    help += ' / 保証ボーダー';
    help2 += '+' + targets[0] + '=確定+' + targets[0] + 'に必要なコイン数';
  } else if (format == 'all') {
    help2 += '+2=確定+2に必要なコイン数, +4=確定+4に..., +6=確定+6に...';
  } else {
	// やさしいひょうじ
	ret = '現在のスコア ' + ret;
    help2 += '約xxxコイン数で+2確定, ...';
  }
  if (!is_hitokoto_comment) {
    ret += ' 🪙 ';
	help += ' 🪙 ';
  }

  ret += results.filter(s => s !== "").join(', ');
  // ret +=  ': ' + getCurrentTime() + '';

  document.getElementById("result").value = ret;
  document.getElementById("result-placeholder").value = help + help2;
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

  if (typeof loadDefaultMeter === 'function') {
	// plan.html からも呼ばれる
    loadDefaultMeter();
  }
  if (typeof loadDefaultPlan === 'function') {
    loadDefaultPlan();
  }

  renderNavis("navi_func", "navi_rank", "footer");

  // GETパラメータ r で指定されたランクをチェックする
  const key = selectedRank();

  // if (document.getElementById("a2")) {
  //   applyPreset(key);
  // }
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


  // 初回計算
  calculate();

  renderGlossary();
  setupTooltips();
  window.tableHeaderFixer();
});

if (document.getElementById("glossary")) {
	window.addEventListener("hashchange", () => {
		hashChangeGlossary();
	});
}

window.copyResult = copyResult;
