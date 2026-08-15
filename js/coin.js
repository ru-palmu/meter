// 本体:
// ライブスコアから確定スコアまでのコイン数算出
const METER_PREFIX = 'meter_meter_';

const METER_INPUT_SELECT = [
	// [session-id, html-id]
	['format', 'meter-copy-format'],
	['live_score', 'live_score'],
	['meter-display-2', 'meter-display-2'],
	['meter-display-4', 'meter-display-4'],
	['meter-display-6', 'meter-display-6'],
];

function updateUrlMeter() {
	return updateUrl([]);
}


let gaTimer = null;

function sendCalcEvent() {
  let border_type = document.getElementById("border-type")?.value;
  if (border_type !== 'dynamic') {
	border_type = 'static';
  }

  const rank = selectedRank("undefined");
  window.gtag('event', 'coin_calc', {
    event_category: border_type,
    user_rank: rank,
  });
}


function calculateWrapper() {
  // GAのイベント送信
  calculate(); // 元の処理

  // 変更イベントのたびに gtag() 送るのはやりすぎなので，
  // 最後の変更から800ms後に送るようにする（変更が続く場合は送らない）
  clearTimeout(gaTimer);
  gaTimer = setTimeout(sendCalcEvent, 800);
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
	// 変動値
    calculateDynamicScores(rank, a, b);
  } else {
	// 確定値
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
	['meter-display-2', 'meter-display-4', 'meter-display-6'].forEach(id => {
		const elm = document.getElementById(id);
		if (!elm) {
			return;
		}
		const value = elm.checked ? 1 : 0;
		table.push([id, value]);
	});

	saveSessionArgs(METER_PREFIX, table);
}

function loadDefaultMeter() {
	loadDefaultValues(METER_PREFIX, METER_INPUT_SELECT);
}

// 「変動値」用
function calculateDynamicScores(rank, a, b) {
  const tbody = document.getElementById("meter-result-tbody")
  tbody.innerHTML = '';

  target = 'g';
  const score = parseInt(document.getElementById("dynamic-border-value")?.value ?? '0') || '0';
  const coin = score2coin(score, b, 'normal') ?? 0;
  const tr = __reanderMeterCardRow(score, b, target);
  tbody.appendChild(tr);

  const str = __resultMeterStr(b, score, coin, target, true);
  __setTextAreaText('result', str);
}

function __createSpan(className, textContent) {
	const span = document.createElement('span');
	span.classList.add(className);
	span.textContent = textContent;
	return span;
}

function __setTextAreaText(id, str) {
  const ta = document.getElementById(id);
  ta.value = str;

  // str の行数を数える
  const lineCount = str.split('\n').length;
  ta.rows = Math.min(Math.max(lineCount, 1), 10); // 最小3行、最大10行
}

function __reanderMeterCardRow(score, b, target) {
  const tr = document.createElement('tr');

  const th = document.createElement('th');
  th.scope = 'row'
  if (target != 'g') {
    th.appendChild(__createSpan('point-' + target, target));
  }
  th.appendChild(__createSpan('meter-result-target', '⤴ ' + formatPalmu(score) + 'まで'));
  tr.appendChild(th);

  const td2 = document.createElement('td');
  td2.classList.add('meter-result-coins');
  td2.appendChild(__createSpan('meter-result-unit', '🎁'));
  const coin = score2coin(score, b, 'normal');
  td2.appendChild(__createSpan('meter-result-value', coin.toLocaleString()));
  tr.appendChild(td2);

  const td3 = document.createElement('td');
  td3.classList.add('meter-result-copy');
  const button = document.createElement('button');
  button.textContent = 'コピー';
  button.classList.add('meter-copy-button');
  td3.appendChild(button);
  tr.appendChild(td3);

  button.addEventListener("click", async () => {
    const str = __resultMeterStr(b, score, coin, target, true);
    window.copyToClipboard(str);
    // document.getElementById('result-placeholder').value = str;
    // return updateUrlMeter();
  });
  return tr;

}


// 全体コピー
function copyAllMeter() {
  const str = document.getElementById('result').value;
  if (str !== '') {
    window.copyToClipboard(str);
  }
}


function __makeAllMeterStr(a, b) {
  const checkboxes = document.querySelectorAll('input[name="meter-display"]:checked');
  if (checkboxes.length === 0) {
    return '';
  }

  const format = document.getElementById("meter-copy-format").value;

  let str = '';
  let sep = ''
  const mark_livescore = '⤴';
  if (format == "easy") {
	  str = '現在のスコア ' + mark_livescore + b.toLocaleString();
	  sep = '\n';
  } if (format == "simple") {
	  str = mark_livescore + b.toLocaleString() + ' 🎁 ';
	  sep = ' ';
  }

  let is_end = false;
  checkboxes.forEach(checkbox => {
    const target = checkbox.value;
    const score = a[target];
    const coin = score2coin(score, b, 'normal');
	if (format == "short" && coin == 0 || is_end) {
		return ;
	}
	let s = __resultMeterStr(b, score, coin, target, false);
	if (format == "easy") {
	  coin_str = coin.toLocaleString();
	  if (coin_str.length < 10) {
	    s = (" ".repeat(10 - coin_str.length)) + s;
	  }
    }
	str += sep + s;

	if (format == "short") {
		is_end = true;
	}
  });

  return str;
}


function __resultMeterStr(score, goal, coin, point, prefix) {
  const format = document.getElementById("meter-copy-format").value;
  const MARK_SCORE = '⤴';
  if (format === 'easy') {
    if (point == "g") {
        return `現在のスコア ${MARK_SCORE}${score.toLocaleString()} / ${formatPalmu(goal)} | 🎁${coin.toLocaleString()}で目標達成`;
    } else {
        const p = prefix ? ('現在のスコア ⤴' + score.toLocaleString() + ' 🎁 ') : '';
      return `${p}${coin.toLocaleString()}コインで+${point}確定 / ${formatPalmu(goal)}`;
    }
  } else if (format === 'short') {  // 一言コメント用
    return `${score}→🎁${coin}`;
  } else if (format === 'simple') {
    if (point == "g") {
      return `🎁 ${coin.toLocaleString()}  (⤴${score.toLocaleString()} / ${formatPalmu(goal)})`;
    } else {
      const p = prefix ? (score.toLocaleString() + ' 🎁 ') : '';
      return `${p}+${point}=${coin.toLocaleString()}/${formatPalmu(goal)}`;
    }
  } else {
    return `unknown format; ${format}`;
  }
}


// 「確定値」用：現在のライブスコアから確定スコアまでのコイン数を算出
function calculateLiveScoreToCoins(a, b) {

  const tbody = document.getElementById("meter-result-tbody")
  tbody.innerHTML = '';

  const checkboxes = document.querySelectorAll('input[name="meter-display"]:checked');
  if (checkboxes.length === 0) {
    // 何もチェックされていない
    document.getElementById('meter-result-empty').hidden = false;
    document.getElementById('meter-result-table').hidden = true;
  } else {
    document.getElementById('meter-result-empty').hidden = true;
    document.getElementById('meter-result-table').hidden = false;
    checkboxes.forEach(checkbox => {
      const target = checkbox.value;
      const score = a[target];
      const tr = __reanderMeterCardRow(score, b, target);
      tbody.appendChild(tr);
    });
  }

  const str = __makeAllMeterStr(a, b);
  __setTextAreaText('result', str);
  return ;
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
  ['a2', 'a4', 'a6', 'meter-copy-format', 'live_score', 'coin', 'dynamic-border-value', 'border-type'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateWrapper, undefined);
  });

  document.querySelectorAll('input[name="meter-display"]').forEach(elm => {
	  elm.addEventListener('change', () => {
		  calculateWrapper();
	  });
  });

  // 初回計算
  calculate();

  renderGlossary();
  setupTooltips();
  window.tableHeaderFixer();
});


window.updateUrlMeter = updateUrlMeter;
