// 本体:
// ライブスコアから確定スコアまでのコイン数算出
const METER_PREFIX = 'meter_meter_';

const METER_INPUT_SELECT = [
	// [session-id, html-id]
	['format', 'result-format'],
	['live_score', 'live_score'],
	['date', 'date-select'],
];

function updateUrlMeter() {
	return updateUrl([]);
}

function calculate(rank = '') {

  const coinInput = document.getElementById("coin");
  if (coinInput) {
	const coinValue = parseInt(coinInput.value);
	if (!isNaN(coinValue) && coinValue > 0) {
	  // コイン数が正の整数の場合は、ライブスコアに反映
	  const livescore = window.coin2score(coinValue);
	  document.getElementById("result").value = Math.floor(livescore);
	  return ;
	}
  }


  if (rank instanceof Event) {
    rank = '';
  }
  if (!rank) {
    rank = selectedRank();
  }

  const a = {
    2: parseInt(document.getElementById("a2")?.value ?? '0'),
    4: parseInt(document.getElementById("a4")?.value ?? '0'),
    6: parseInt(document.getElementById("a6")?.value ?? '0')
  };


  let b = parseInt(document.getElementById("live_score").value);

  if (isNaN(b) || b === 0) {
    b = 0;
  }

  const border_type = document.getElementById("border-type")?.value;
  if (border_type === 'dynamic') {
    calculateDynamicScores(rank, a, b);
  } else {
    calculateLiveScoreToCoins(a, b);
  }

  // 保証ボーダーをコピー機能
  setForGuaranteedScoreCopy('scores', rank, a);

  _saveMeterArgs();
  saveCustomGuaranteedScores(rank, a);
}


// 出力形式を保存する
function _saveMeterArgs() {
	const table = [];
	METER_INPUT_SELECT.forEach(([session_id, html_id]) => {
		const elm = document.getElementById(html_id);
		if (!elm) {
			return;
		}
		const value = elm.value;
		if (value !== null && value !== undefined) {
			table.push([session_id, value]);
		}
	});
	saveSessionArgs(METER_PREFIX, table);
}

function loadDefaultMeter() {
	loadDefaultValues(METER_PREFIX, METER_INPUT_SELECT);
}

// いったん，calculateLiveScoreToCoins のコピーから
function calculateDynamicScores(rank, a, b) {

  const format = document.getElementById("result-format").value;

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


  a['g'] = parseInt(document.getElementById("dynamic-border-value")?.value ?? '0');

  const s2calgo = format.endsWith('_per3') ? 'per3' : 'normal';

  const results = ['g'].map(i => {
    // 残スコアから必要コイン数を算出
    const s = score2coin(a[i], b, s2calgo);
    if (s < 20) {
        return '';
    }
    if (format.startsWith('easy')) {
        return `${s.toLocaleString()}コインで目標値達成`;
    } else if (format.endsWith('x')) {
        // 一言
        return s;
    } else if (targets.length == 1) {
        return `変動+${targets[0]}=${s.toLocaleString()}`;
    } else {
        return `目標値=${s.toLocaleString()}`;
    }
  });

  let help = '現在のスコア';
  let help2 = '';

  let ret = b.toLocaleString();
  let is_hitokoto_comment = false;
  if (format.endsWith('x')) {	// 一言コメント用 15文字以内
    // 2x, 4x, 6x
    ret = b + '→🪙';
    is_hitokoto_comment = true;
    help += '→🪙';
    help2 += '変動+' + targets[0] + 'に必要なコイン数';
  } else if (targets.length == 1 || format == 'all') {
    // +2, +4, +6 のみ
    ret += ' / ' + formatAsK(a['g']) + 'k';
    help += ' / 目標値';
    if (format == 'all') {
        help2 += '目標値=目標値に必要なコイン数';
    } else {
        help2 += '変動+' + targets[0] + '=目標値に必要なコイン数';
    }
  } else {
    // やさしいひょうじ
    ret = '現在のスコア ' + ret;
    help2 += '約xxxコイン数で目標値達成';
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

// 現在のライブスコアから確定スコアまでのコイン数を算出
function calculateLiveScoreToCoins(a, b) {

  const format = document.getElementById("result-format").value;
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

function __getTodayString() {
	const now = new Date();
	const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

	const y = jst.getFullYear();
	const m = String(jst.getMonth() + 1).padStart(2, '0');
	const d = String(jst.getDate()).padStart(2, '0');

	return `${y}${m}${d}`;
}


function _dynamicBorderSetup(user_rank, selector) {
	const div_border = document.getElementById("dynamic-border-value-container");

	// 日付確認して，前日保存分の情報は削除する
	const dkey = 'dynamic-border-date-' + user_rank;
	const saved_date = localStorage.getItem(dkey);
	const today = __getTodayString();
	const tkey = 'dynamic-border-type-' + user_rank;
	const vkey = 'dynamic-border-value-' + user_rank;
	if (saved_date !== today) {
		// 日付が異なるなら保存情報を削除
		localStorage.removeItem(tkey);
		localStorage.removeItem(vkey);
	}

	const border_type = localStorage.getItem(tkey);
	if (selector instanceof HTMLSelectElement) {
		selector.value = border_type ? border_type : 'guaranteed';

		selector.addEventListener('change', () => {
			localStorage.setItem(tkey, selector.value);
			localStorage.setItem(dkey, today);
		});

		selector.addEventListener('change', () => {
			div_border.hidden = (selector.value !== 'dynamic');
		});
		div_border.hidden = (selector.value !== 'dynamic');
	}

	const input_value = document.getElementById("dynamic-border-value");
	if (input_value) {
		const border_value = localStorage.getItem(vkey);
		if (border_value) {
			input_value.value = border_value;
		}
		input_value.addEventListener('input', () => {
			localStorage.setItem(vkey, input_value.value);
			localStorage.setItem(dkey, today);
		});
	}
}

// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {

  const user_rank = renderNavis("navi_func", "navi_rank", "footer");

  const selector_id = insertGuaranteedScore("guaranteed-score", user_rank);
  loadDefaultMeter();
  if (selector_id) {
    updateGuaranteedScore(selector_id, user_rank);
    const select = document.getElementById(selector_id);
    if (select) {
      select.addEventListener('change', () => {
        updateGuaranteedScore(selector_id, user_rank);
      });
    }
  }

  const border_type = document.getElementById("border-type");
  if (border_type) {
    _dynamicBorderSetup(user_rank, border_type);
  }

  if (user_rank) {
    // 表示改善. ランクが決定しているときはランク表示を追加
    [
      ['index_rank', 'ランク', 'での'],
//      ['history_rank', 'ランク', 'の'],
    ].forEach(([id, prefix, suffix]) => {
       setRankText(user_rank, id, prefix, suffix);
    });
  }

  // 入力変更時に自動計算
  ['a2', 'a4', 'a6', 'result-format', 'live_score', 'coin', 'dynamic-border-value', 'border-type'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculate, undefined);
  });


  // 初回計算
  calculate();

  renderGlossary();
  setupTooltips();
  window.tableHeaderFixer();
});


window.updateUrlMeter = updateUrlMeter;
