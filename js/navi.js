// ヘッダ部のナビゲーションを管理するスクリプト
// 共通関数的なものも管理

const COMMON_PREFIX = 'meter_common_';

const RANK_CUSTOM = "Z";

const cand_rank = ["D", "C1", "C2", "C3", "B1", "B2", "B3", "A1", "A2", "A3", "A4", "A5", "S", "SS", RANK_CUSTOM];

const RANK_DIC = {}
for (let i = 0; i < cand_rank.length; i++) {
    RANK_DIC[cand_rank[i]] = i;
}

// preset から最新の日付を取得. meter.js 読み込み済みと仮定
const latestDate = Object.keys(presets).sort().reverse()[0];

function getCandRank(group = '') {
	// RANK_CUSTOM 以外のランクを返す
	return cand_rank.filter(r => r !== RANK_CUSTOM && (group == '' || group.includes(r[0])));
}


//////////////////////////////////////////////////
// 共通関数
//////////////////////////////////////////////////

// キロ表示
function formatAsK(value) {
  if (value < 100000) {
    return (Math.floor(value / 100) / 10).toFixed(1);  // 小数第1位（切り捨て）
  } else {
    return Math.floor(value / 1000);      // 整数（千単位）
  }
}

function formatPalmu(value) {
  if (value < 10000) {
    // カンマ区切りで
    return value.toLocaleString();
  } else if (value < 1000000) {
    return formatAsK(value) + "K";
  } else {
    return (Math.floor(value / 10000) / 100).toFixed(2)+ "M";
  }
}

function score2coin_orig(score) {
	const a0 = 3.040719436589159;
	const b0 = 0;
	const a1 = 2.6950897058012684;
	const b1 = 15531.441501008434;
	const a2 = 2.5483011271896387;
	const b2 = 41958.68833499996;
	const model = [[b0, a0], [b1, a1], [b2, a2]];

	return Math.max(...model.map(([b, a]) => (score - b) / a));
}

// ライブスコアに相当するコイン数を算出する．
// ギフトの最小値が 10 のため, 1の位を切り上げ.
function score2coin(goal_score, current_score, algorithm='normal') {
  let coin = 0;
  if (algorithm === 'per3') {
    coin = (goal_score - current_score) / 3;
  } else {
    coin = score2coin_orig(goal_score) - score2coin_orig(current_score);
  }
  return Math.ceil(coin / 10) * 10;
}

function scoreOrCoin(val, metrics, format) {
	if (metrics.startsWith('coin')) {
		const s2calgo = (metrics.endsWith('_per3')) ? 'per3' : 'normal';
		val = score2coin(val, 0, s2calgo);
	}

	return scoreToString(val, format);
}

function scoreToString(val, format) {
	if (format === "comma") {
		// カンマ区切り
		return val.toLocaleString();
	} else if (format === "short") {
		return formatPalmu(val);
	} else {
		return val;
	}
}

function plan2scoreOrcoin(plan, preset, metrics) {
	return [...plan].reduce((acc, ch) => {
		const score = preset[parseInt(ch)] ?? 0;
		const val = scoreOrCoin(score, metrics, "raw");
		return acc + val;
	}, 0);
}


// 現在時刻取得．未使用
function __getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}


function setRankText(rank, elementId, prefix, suffix) {
  const sp = document.getElementById(elementId);
  if (sp) {
    sp.textContent = prefix + rank + suffix;
  }
}


// session からデフォルト値を獲得する
function loadDefaultValues(prefix, table) {
	table.forEach(([session_id, elem_id]) => {
		const elem = document.getElementById(elem_id);
		if (elem) {
			const value = sessionStorage.getItem(prefix + session_id);
			if (value) {
				elem.value = value;
			}
		}
	});
}

function saveSessionArgs(prefix, table) {
	table.forEach(([key, value]) => {
		sessionStorage.setItem(prefix + key, value);
	});
}

function updateUrl(table) {
    // セレクタを選んだらリダイレクトする
  const params = new URLSearchParams(window.location.search);

  table.forEach((item) => {
      const elemId = item[0];
      const paramName = item[1];

      const elem = document.getElementById(elemId);
      if (!elem) {
          console.log(`Element not found: ${elemId}`);
          return ;
      }
      if (elem.value === "") {
          params.delete(paramName);
      } else {
          params.set(paramName, elem.value);
      }
  });

  // スクロール位置を保存
  sessionStorage.setItem('scrollY', window.scrollY);

  // 更新したクエリでリダイレクト
  window.location.href = window.location.pathname + "?" + params.toString();
}

// スクロール位置を復元
window.addEventListener('load', () => {
	const y = sessionStorage.getItem('scrollY');
	if (y !== null) {
		window.scrollTo(0, parseInt(y, 10));
		sessionStorage.removeItem('scrollY'); // 一度使ったら消す
	}
});

function applyParamToElement(elemId, paramName, params) {
	const val = params.get(paramName) || '';
	if (val) {
		const el = document.getElementById(elemId);
		if (!el) {
			return;
		}

		switch (el.tagName) {
		case 'SELECT':
			// 妥当な値なら選択状態にする
			if ([...el.options].some((op) => op.value === val)) {
				el.value = val;
			}
			break;
		case 'INPUT':
		case 'TEXTAREA':
			el.value = val;
			break;
		}
	}
}

function applyParamsToFormControls(table) {
	const params = new URLSearchParams(window.location.search);
	table.forEach((item) => {
		applyParamToElement(item[0], item[1], params);
	});
}


//////////////////////////////////////////////////
// 確定スコアの描画
//////////////////////////////////////////////////
//
function updateGuaranteedScore(selector_id, rank) {
	const select = document.getElementById(selector_id);
	if (!select) {
		return;
	}
	const ymd = select.value;
	if (!ymd || !window.presets[ymd]) {
		return;
	}
	const data = window.presets[ymd];
	const r = data[rank];   // 指定ランクの辞書

	document.getElementById("a2").value = r[2];
	document.getElementById("a4").value = r[4];
	document.getElementById("a6").value = r[6];
	document.getElementById("a2").dispatchEvent(new Event("input"));
}

function _getCustomGuaranteedScore(label, default_value) {
	const v = Number(localStorage.getItem('CustomLiveScore' + label));
	return Number.isInteger(v) && v > 0 ? v : default_value;
}


function updatePresetsCustomRank(values) {
	// 辞書を更新
	const child = presets[latestDate];
	child[RANK_CUSTOM] = {
		2: values[2],
		4: values[4],
		6: values[6],
	}
}

function _loadCustomGuaranteedScore() {
	const values = {
		2: _getCustomGuaranteedScore('+2', 43950),
		4: _getCustomGuaranteedScore('+4', 84990),
		6: _getCustomGuaranteedScore('+6', 172990),
	}
	updatePresetsCustomRank(values);
}

_loadCustomGuaranteedScore();	// 初期化時に読み込み

// 「保証ボーダーをコピー」機能用の設定
function setForGuaranteedScoreCopy(score_id, rank = '', a = null) {
  const target = document.getElementById(score_id);
  if (!target) {
    return;
  }
  const label = labelGuaranteedScore(rank);
  const ret = `${label} +2=${formatAsK(a[2])}k, +4=${formatAsK(a[4])}k, +6=${formatAsK(a[6])}k`;
  target.value = ret;
}

function saveCustomGuaranteedScores(rank, values) {
	if (rank === RANK_CUSTOM) {
		Object.entries(values).forEach(([k, v]) => {
			// 正の整数だったら保存する
			if (Number.isInteger(v) && v > 0) {
				localStorage.setItem('CustomLiveScore+' + k, v);
			}
		});
		updatePresetsCustomRank(values);
	}
}

function labelGuaranteedScore(rank) {
	if (rank === RANK_CUSTOM) {
		return 'カスタムスコア';
	} else {
		return rank + '保証ボーダー';
	}
}

// 保証ボーダーの入力欄とコピーエリアを挿入
function insertGuaranteedScore(targetId, rank) {
    const container = document.getElementById(targetId);
    if (!container) {
        return '';
    }

    // 必要なら中身を初期化
    container.innerHTML = '';

    const outerDiv = document.createElement('div');
    outerDiv.className = 'guaranteed-score';

    // タイトル
    const titleSpan = document.createElement('span');

    let select_id = '';
    let title_copy = '';

    title_copy = titleSpan.textContent = labelGuaranteedScore(rank);

    if (rank !== RANK_CUSTOM) {
      const small = document.createElement('small');

      // 保証ボーダーの日付セレクトボックス
      const select = document.createElement('select');
      select_id = select.id = 'date-select';

      for (const ymd of Object.keys(presets).sort().reverse()) {
          // rank が存在しない日付はスキップ
          if (!presets[ymd][rank]) {
              continue;
          }

          const formatted = `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
          const op = document.createElement('option');
          op.value = ymd;
          op.textContent = formatted;
          select.appendChild(op);
      }

      small.appendChild(document.createTextNode('（確定値 '));
      small.appendChild(select);
      small.appendChild(document.createTextNode(' ver.）'));

      titleSpan.appendChild(small);
    }

    outerDiv.appendChild(titleSpan);

    // 保証ボーダーの入力欄
    _renderGuaranteedScoreInputs(outerDiv, rank != RANK_CUSTOM);

    // 保証ボーダーのコピーエリア
    renderGuaranteedScoreCopyArea(outerDiv, title_copy);

    container.appendChild(outerDiv);

    return select_id;
}

function _renderGuaranteedScoreInputs(outerDiv, readonly) {
    // 入力行
    const values = [
        { id: 'a2', label: '+2', value: _getCustomGuaranteedScore('+2', 43950) },
        { id: 'a4', label: '+4', value: _getCustomGuaranteedScore('+4', 84990) },
        { id: 'a6', label: '+6', value: _getCustomGuaranteedScore('+6', 172990) },
    ];

    values.forEach(item => {
        const row = document.createElement('div');
        row.className = 'input-row';

        const label = document.createElement('label');
        label.setAttribute('for', item.id);
        label.textContent = item.label;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = item.id;
        input.value = item.value;
        input.readOnly = readonly;
        if (readonly) {
            input.className = 'guaranteed-score-readonly';
        }

        row.appendChild(label);
        row.appendChild(input);
        outerDiv.appendChild(row);
    });
}

// コピーボタン
async function copyResult(id) {
  const text = document.getElementById(id).value
    ?? document.getElementById(id).innerText;

  await navigator.clipboard.writeText(text);
}

async function onCopyAndRedirect(id, redirectFunc) {
	await copyResult(id);
	return redirectFunc();
}


function renderGuaranteedScoreCopyArea(outerDiv, title_copy) {
    // コピーボタン
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.textContent = '📋' + title_copy + 'をコピー';
    button.setAttribute('onclick', "copyResult('scores')");
    outerDiv.appendChild(button);

    // テキストエリア
    const textarea = document.createElement('textarea');
    textarea.className = 'copy-output';
    textarea.id = 'scores';
    textarea.readOnly = true;
    textarea.cols = 40;
    textarea.rows = 1;
    textarea.textContent = '(スコア)';
    outerDiv.appendChild(textarea);
}


//////////////////////////////////////////////////
// ナビゲーションのレンダリング
//////////////////////////////////////////////////

function renderNavis(navi_func, navi_rank, __footer) {
	const page = _getCurrentPage();
	_renderNaviFunc(page, navi_func);
	const rank = selectedRank();
	localStorage.setItem(COMMON_PREFIX + "selected_rank", rank);
	_renderNaviRank(rank, navi_rank);

	appendCurrentQueryToLinks('append-query')
	_renderFooter();
	if (typeof PALMU_NOTICES !== "undefined") {
		_renderNotices('notice-banner', PALMU_NOTICES);
	}

	renderDescriptionRankCustom(rank);
	return rank;
}

function renderDescriptionRankCustom(rank) {
	if (rank !== RANK_CUSTOM) {
		return ;
	}
	const spanCustom = document.getElementById("description-rank-custom");
	if (!spanCustom) {
		return ;
	}

	const label = labelGuaranteedScore(rank);
	spanCustom.innerHTML = `ランク <strong>${RANK_CUSTOM}</strong> は，保証ボーダーが誤っていた場合などで使用することを想定しています．
	${label}で設定した値は，ローカルストレージに保存され，次回以降も利用できます．`
}

function _getCurrentPage() {
  const path = location.pathname;
  let filename = path.split('/').pop(); // 最後の要素を取得

  // ルート（/）や末尾がスラッシュだけのパスなら
  if (!filename || filename === '') {
    return 'index';
  }

  // クエリパラメータやアンカーがある場合は無視して，拡張子を除く
  filename = filename.split('?')[0].split('#')[0].split('.')[0];

  return filename || 'index';
}


function _getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function isValidRank(rank, date) {
	return presets[date] && presets[date][rank];
}

// 選択されているランクを取得
function selectedRank() {
  const presetFromURL = _getQueryParam("r");
  let key = default_rank;
  if (isValidRank(presetFromURL, latestDate)) {
    key = presetFromURL;
  } else {
    let kk = localStorage.getItem(COMMON_PREFIX + "selected_rank");
    if (isValidRank(kk, latestDate)) {
      key = kk;
    }
  }
  return key;
}


function _marshmallow() {
	const li = document.createElement('li');
	li.className = 'sub-tab';

	const a = document.createElement('a');
	a.href = 'https://marshmallow-qa.com/fcbapahukbveobw?t=mZ9AzD&utm_medium=url_text&utm_source=promotion';
	a.textContent = '質問箱';
	li.appendChild(a);
	return li
}


// X へのシェアボタンを生成
function _shareX() {
  // Xでシェアボタンを追加
  const shareLi = document.createElement('li');
  shareLi.className = 'sub-tab share-btn';

  const shareA = document.createElement('a');
  shareA.href = `https://x.com/ru_palmu/status/1979435586030329963`;
  shareA.target = '_blank';
  shareA.rel = 'noopener noreferrer';
  shareA.style.display = 'flex';
  shareA.style.alignItems = 'center';
  shareA.style.gap = '4px';

  // SVGアイコン（公式Xロゴ）
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('viewBox', '0 0 1200 1227');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M714.163 519.284L1160.89 0H1040.49L667.137 432.009L370.906 0H0l469.746 682.897L0 1226.75h120.406l396.57-458.77 311.26 458.77H1200L714.163 519.284zM562.78 698.065l-45.933-65.932-367.02-527.611h157.662l295.635 424.871 45.932 65.932 379.115 544.369H870.51L562.78 698.065z');


  svg.appendChild(path);

  // テキスト
  const textNode = document.createTextNode('シェア');

  shareA.appendChild(svg);
  shareA.appendChild(textNode);
  shareLi.appendChild(shareA);
  return shareLi;
}

// 機能に関するナビゲーションをレンダリング
// page：現在のページID
// target：ナビゲーションを表示する要素のID
function _renderNaviFunc(page, target) {
	const container = document.getElementById(target);
	if (!container) {
		return;
	}

	const pages = [
		{ id: "index", name: "確定値", url: "index.html" },
		{ id: "border", name: "変動値", url: "border.html" },
		{ id: "plan", name: "プラン", url: "plan.html" },
		{ id: "history", name: "履歴", url: "history.html" },
		{ id: "schedule", name: "予定表", url: "schedule.html" },
		{ id: "event", name: "イベント", url: "event.html" },
		{ id: "about", name: "使い方", url: "about.html" },
	];

	const query = window.location.search;
	const params = new URLSearchParams(query);

	const picks = new URLSearchParams();
	['r'].forEach(k => {
		const v = params.get(k);
		if (v) {
			picks.set(k, v);
		}
	});
	const query_str = picks.toString() ? `?${picks.toString()}` : '';

	const ul = document.createElement('ul');
	ul.className = 'sub-tab-nav';

	for (const p of pages) {
		const li = document.createElement('li');
		li.className = 'sub-tab';
		if (p.id === page) {
			li.classList.add('active');
		}
		const a = document.createElement('a');
		a.href = `${p.url}${query_str}`;
		a.textContent = p.name;
		li.appendChild(a);
		ul.appendChild(li);
	}

	// マシュマロ, X へのシェアボタン
	[_marshmallow(), _shareX()].forEach(li => {
		ul.appendChild(li);
	});

	container.innerHTML = '';
	_renderTabNaviWrapper(container, ul);
}

function _renderTabNaviWrapper(container, ul) {
  const wrapper = document.createElement("div");
  wrapper.className = "tab-nav-wrapper";

  const leftHint = document.createElement("div");
  leftHint.className = "scroll-hint left";
  leftHint.textContent = "←";

  const rightHint = document.createElement("div");
  rightHint.className = "scroll-hint right";
  rightHint.textContent = "→";

  wrapper.appendChild(leftHint);
  wrapper.appendChild(ul);
  wrapper.appendChild(rightHint);

  container.appendChild(wrapper);
  // 矢印の表示制御
  function updateHints() {
    const atStart = ul.scrollLeft <= 0;
    const atEnd = ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 1;
    leftHint.classList.toggle("hidden", atStart);
    rightHint.classList.toggle("hidden", atEnd);
  }

  ul.addEventListener("scroll", updateHints);
  window.addEventListener("resize", updateHints);
  updateHints();
}

// 各ページ上部のランク選択タブの描画
function _renderNaviRank(selected_rank, target_id) {
  const container = document.getElementById(target_id);
  if (!container) {
    return ;
  }
  container.innerHTML = ""; // クリア

  const available = presets[latestDate];

  const ul = document.createElement("ul");
  ul.className = "tab-nav";

  const params = new URLSearchParams(window.location.search);

  cand_rank.forEach(rank => {
    if (available && available[rank]) {
      const li = document.createElement("li");
      if (rank === selected_rank) {
        li.className = "active";
      } else {
        li.className = rank[0];
      }
      const a = document.createElement("a");
      params.set("r", rank);
      a.href = `?${params.toString()}`;
      a.textContent = rank;
      li.appendChild(a);
      ul.appendChild(li)
    }
  });

  _renderTabNaviWrapper(container, ul);

}

//////////////////////////////////////////////////
// お知らせ
//////////////////////////////////////////////////

function __noticeDate(date, before) {
    // 日付だけの場合は0時に設定されるため、時刻情報がない場合は1日後の23:59に設定
	const d = new Date(date);
	if (before != 0) {
		// before 日前にする
		d.setDate(d.getDate() - before);
	}
	if (!date.includes('T')) {
		d.setHours(23, 59, 59, 999);
	}
	return d;
}

function __renderNoticeArchive() {
	const a = document.createElement('a');
	a.href = 'news.html';
	a.className = 'notice-archive-link';
	a.textContent = '過去のお知らせ';
	return a;
}

/**
 * 指定した要素に1週間以内のお知らせを表示
 * 日付だけ、または日時（YYYY-MM-DD or YYYY-MM-DDTHH:MM）に対応
 * @param {string} elementId - バナーを挿入する要素のID
 * @param {Array} notices - 日付・テキスト・URLを含む通知配列
 */
function _renderNotices(elementId, notices) {
  const banner = document.getElementById(elementId);
  if (!banner) {
    return ;
  }

  const now = new Date();

  // 表示する項目を絞り込み
  const upcoming = notices.filter(n => {
  const end = n.end ? new Date(n.end) : __noticeDate(n.date, 0);
  const start = n.start ? new Date(n.start) : __noticeDate(n.date, 7);

  // console.log([start.toISOString(), now.toISOString(), end.toISOString(), n.text, start <= now, now <= end]);
    return start <= now && now <= end;
  });
  if (upcoming.length === 0) {
    const a = __renderNoticeArchive();
    banner.appendChild(a);
    return ;
  }


  banner.style.display = 'block'; // お知らせがある

  const ul = document.createElement('ul');
  ul.className = 'notice-list';

  upcoming.forEach(n => {
    const li = document.createElement('li');
    // 日付を YYYY/MM/DD の形式に変換
    const date = new Date(n.date);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // 月は0から始まるので+1
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}/${mm}/${dd}: `;
    li.appendChild(document.createTextNode(formattedDate));

    let displayText = n.text;
    if (n.time) displayText += ` (${n.time})`; // 時間情報を表示

    if (n.url) {
      const a = document.createElement('a');
      a.href = n.url;
      a.textContent = displayText;
      li.appendChild(a);
    } else {
      li.appendChild(document.createTextNode(displayText));
    }

    if (n.links && n.links.length > 0) {
        li.appendChild(document.createTextNode(' '));
        n.links.forEach(l => {
            li.appendChild(document.createTextNode('['));
            if (l.file) {
                const a = document.createElement('a');
                a.href = `../data/${l.file}`;
                a.textContent = l.label;
                li.appendChild(a);
            } else if (l.url) {
                const a = document.createElement('a');
                a.href = l.url;
                a.textContent = l.label;
                li.appendChild(a);
            }
            li.appendChild(document.createTextNode(']'));
        });
    }
    ul.appendChild(li);
  });

  banner.appendChild(ul);
  const a = __renderNoticeArchive();
  banner.appendChild(a);
}


//////////////////////////////////////////////////
// フッタ部
//////////////////////////////////////////////////

function _renderFooter() {
  const footer = document.getElementById("footer");
  if (!footer) return;

  const year = new Date().getFullYear(); // ← 現在の年を取得

  const aopt = 'target="_blank" rel="noopener"';
  footer.innerHTML = `
    <div class="footer-content">
      © ${year} (る) |
      <a href="https://github.com/ru-palmu/meter/" ${aopt}>GitHub</a>, <a href="https://x.com/ru_palmu" ${aopt}>X</a>
    </div>
  `;
}

//////////////////////////////////////////////////
// ヘルプ用のツールチップ
//////////////////////////////////////////////////
const glossary = {
	coin: {
		msg: "コイン数は，ライブスコアから本ツール独自のモデルを利用して計算しています．コメント数や視聴者数などにも応じて変動するため参考値としてご利用ください．",
		page: "coin",
		index: "コインスウ",
		dt: "コイン数 <small>（ギフト数）</small>",
		dd: "コイン数は，<span class='term' data-term='score'>ライブスコア</span>から本ツール独自のモデルを利用して計算しています．ライブスコアの算出方法は公開されていないこと，また，コメント数や視聴者数などにも応じて変動するため参考値としてご利用ください．" +
"<p>ライブスコアの算出方法は公開されていないものの，ギフトがライブスコアに最も寄与することは間違いありません．また，コイン人数・コメント人数など応援に参加した人数が寄与することも分かっています．" +
"",

	},
	score: {
		msg: "ライブスコアとは，ライバーさんがリスナーさんから受け取る応援を示す指標で，コメントの数や視聴人数，スーパーライクの回数などもスコアに含まれる．",
		page: "score",
		index: "ライブスコア",
		dt: "ライブスコア",
		dd: "ライブスコアとは，ライバーがリスナーから受け取る応援を示す指標です．１分ごとに更新され，24時（00:00）にリセットされます．１日の間にだんだんと大きくなる数値で，小さくなることはありません．" +
		"<p>ライブスコアは，「<span class='term' data-term='coin'>コイン数</span>」「コメント数」「スーパーライク数」「視聴人数」などの応援要素を総合して算出されていますが，そのロジックは公開されていません．なお，ライクはライブスコアには反映されません．" +
"<p>ライブスコアは，配信画面の左上に矢印と共に表示されています．下の画像では，現在のライブスコアが 79,782 であることを表しています．" +
"<p><div class='img'><img src='img/score.png' alt='ライブスコアの例' width='20%'></div>" +
"<p>多くの場合，ライバーが目標となる<span class='term' data-term='point'>デイリーランクポイント</span>を設定し，それに対応するライブスコアを目指すことになります．" +
"<p>より詳細な情報は，『<a href='https://note.com/palmu/n/nc853285c3db3'>【たいむず（2024/10）】ライブスコアの導入</a> <a href='https://note.com/palmu/n/nc853285c3db3#f469e53e-1e96-4c56-8de5-476f1ed9d6f8'>6. ライブスコアの算出ロジックについて</a>』『FAQ: <a href='https://intercom.help/light-inc/ja/articles/9941027-%E3%83%A9%E3%82%A4%E3%83%96%E3%82%B9%E3%82%B3%E3%82%A2%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6'>ライブスコアについて</a>』を参照ください．" +
		"",
	},
	border: {
		msg: "保証ボーダーとは，締め時間に関係なく，その日のライブスコアが規定値を上回ると，デイリーランクポイントの「+2」「+4」「+6」の獲得が保証される仕組みです．別名：確定値，確定スコア",
		page: "gborder",
		index: "ホショウボーダー",
		dt: "保証ボーダー <small>（確定スコア，確定値）</small>",
		dd: "保証ボーダーとは，締め時間に関係なく，その日のライブスコアが規定値を上回ると，<span class='term' data-term='point'>デイリーランクポイント</span>の「+2」「+4」「+6」の獲得が保証される仕組みです．ライバーのプロフィールに表示される「<span class='term' data-term='rank'>ユーザーランク</span>」から，保証ボーダーの値を確認できます．下の場合では，「+2」「+4」「+6」の確定値は，それぞれ，「8,425」「20.2K」「51.4K」です．" +
		"ここで，「K」は「キロ」，つまり，1,000倍の値を表します．「51.4K」の場合，51,400 から 51,499 の間の値を表します．本ツールでは，中央値である 51,450 を採用しています．" +
		"<p><div class='img'><img src='img/border.png' alt='保証ボーダーの例' width='70%'></div>" +
		"<p>なお，本ツールでは，保証ボーダーの値を手動で登録しているため，最新になっていなかったり，間違った値になっている可能性があります．" +
		"不具合報告は，<a href=https://github.com/ru-palmu/meter/issues>GitHub</a> または <a href='https://x.com/ru_palmu'>X</a> までお願いします．" +
"<p>より詳細な情報は，『<a href='https://note.com/palmu/n/n4eb0cf1c4aa8'>【たいむず(2024/6)】保証ボーダーとスキップカードについて</a>』『FAQ: <a href='https://intercom.help/light-inc/ja/articles/9418444-%E4%BF%9D%E8%A8%BC%E3%83%9C%E3%83%BC%E3%83%80%E3%83%BC%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6'>保証ボーダーについて</a>』『ヘルプ：<a href='https://intercom.help/light-inc/ja/articles/10004958-%E4%BF%9D%E8%A8%BC%E3%83%9C%E3%83%BC%E3%83%80%E3%83%BC%E3%81%AE%E8%A1%A8%E8%A8%98%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6'>保証ボーダーの表記について</a>』を参照ください．" +
"",
	},
	rank: {
		msg: "ユーザーランクは，ライバーのプロフィールから確認できます．D〜S までの11段階に分かれています．",
		page: "rank",
		index: "ユーザーランク",
		dt: "ユーザーランク",
		dd: "" +
"<p>ユーザーランクは，D, C1, C2, C3, B1, B2, B3, A1, A2, A3, A4, A5, S, SS の全部で14ランクに分かれています．" +
"D が最も低いランクで，SS が最も高いランクです．" +
"<p>ライバーのユーザーランクはプロフィール（配信画面の左上，ライバーの名前をタップ）から確認できます．" +
"<p><div class='img'><img src='img/profile.png' alt='プロフィールの例' width='70%'></div>" +
"<p>ユーザーランクは，ランク更新期間である 7 日感に獲得した<span class='term' data-term='point'>デイリーランクポイント</span>の合計に応じて" +
"「ランクアップ」「ランクキープ」「ランクダウン」のいずれかの状態になります．" +
"「ランクアップ」には 18 ポイント，「ランクキープ」には 12 ポイントが必要です．" +
"<p>下の画像は，上の画像の「ユーザーランク」を表す「B2ランク」をタップすると表示される画面です．" +
"2日と13時間9分で， +2 を獲得するとランクキープ，+8 を獲得するとランクアップできることを表しています．" +
"ランクアップをめざす場合には，本ツール「<a href='plan.html' class='append-query'>プラン</a>」では <strong>3日</strong>と<strong>8ポイント</strong>を入力してください．" +
"<p><div class='img'><img src='img/rankup.png' alt='保証ボーダーの例' width='70%'></div>" +
"より詳細な情報は，『<a href='https://note.com/palmu/n/nff989241c2bf'>「全てのライバーさんへの配信機能の開放」と，「ユーザーランク」機能について</a>』を参照ください．" +
"",
	},
	point: {
		msg: "デイリーランクポイントは，ライバーがライブスコアに応じて獲得するポイントで，ランクキープ・ランクアップの基準となります．",
		page: "point",
		index: "デイリーランクポイント",
		dt: "デイリーランクポイント",
		dd: "デイリーランクポイントは，ライバーがライブスコアに応じて獲得するポイントです．" +
		"配信を行わなければ「+0」，配信を行うと少なくとも「+1」が獲得できます．" +
		"締め時間である 00:00 までにボーダー，または，<span class='term' data-term='border'>保証ボーダー</span>を超えると，「+2」「+4」「+6」が獲得できます．" +
"<p>下の画像では，保証ボーダーの 83.6K を超えているため，「+2」が獲得できることを表しています．" +
"また，ボーダー（変動スコア）の 118K を超えているため，緑色で「+4」と表示されていますが，" +
"残り 13時間9分の間でボーダーは上がっていく可能性があり，「+4」の獲得は保証されていません．" +
"<p><div class='img'><img src='img/point.png' alt='保証ボーダーの例' width='70%'></div>" +
"より詳細な情報は，『<a href='https://note.com/palmu/n/nff989241c2bf'>アップデート便り(2024/03)</a>』『FAQ：<a href='https://intercom.help/light-inc/ja/articles/9053402-%E3%83%87%E3%82%A4%E3%83%AA%E3%83%BC%E3%83%A9%E3%83%B3%E3%82%AF%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%81%A8%E3%81%AF'>デイリーランクポイントとは</a>』を参照ください．" +
"",
	},
}

function setupTooltips() {
  // ① 全ての .term 要素を探して
  document.querySelectorAll('.term').forEach(term => {

    const key = term.dataset.term;
    const tooltipText = glossary[key];
    if (!tooltipText || tooltipText['msg'] === undefined) {
      return;
    }

    // ② それぞれにクリックイベントをつける
    term.addEventListener('click', (__e) => {
      // ③ 既にツールチップが表示されていたら，消す（トグル）
      const existing = term.querySelector('.tooltip-box');
      if (existing) {
        existing.remove();
        return;
      }

      // ④ 他のツールチップがあれば消す
      document.querySelectorAll('.tooltip-box').forEach(b => b.remove());

      // ⑤ ツールチップを作って中身を設定し，DOMに追加
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip-box';

      let msg = tooltipText['msg'];
      if (tooltipText['page']) {
        const currentParams = window.location.search;
        const href = `about.html${currentParams}#${tooltipText['page']}`;
        msg += `<br><a href="${href}">詳細</a>`;
      }

      tooltip.innerHTML = msg;
      term.appendChild(tooltip);
    });
  });

  // ⑥ ページ全体にクリックイベント
  // .term の外をクリックしたらツールチップを消す
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.term')) {
      document.querySelectorAll('.tooltip-box').forEach(b => b.remove());
    }
  });
}


// ヘルプ：用語集の描画
function hashChangeGlossary() {
  const hash = location.hash;
  if (!hash) {
    return;
  }

  // ハッシュが変更されたら，該当する用語をハイライト
  const dt = document.querySelector(`dl#glossary dt${hash}`);
  if (dt) {
    dt.classList.add('highlighted');

    setTimeout(() => {
      dt.classList.remove('highlighted');
    }, 5000); // 5秒後にハイライトを消す
  }
}


// ヘルプ：用語集の描画
function renderGlossary() {
  const dl = document.getElementById("glossary");
  if (!dl) {
    return;
  }

  const hash = location.hash;

  const sortedTerms = Object.values(glossary).sort((a, b) => {
    if (a.index < b.index) return -1;
    if (a.index > b.index) return 1;
    return 0;
  });

  for (const term of sortedTerms) {
    const dt = document.createElement("dt");
    dt.id = term.page;

    const a = document.createElement("a");
    const currentParams = window.location.search;
    a.href = `${currentParams}#${term.page}`;
    a.innerHTML = term.dt;
    dt.appendChild(a);
    if (hash == `#${term.page}`) {
      dt.className = 'highlighted';

      setTimeout(() => {
        dt.className = '';
      }, 5000);
    }

    const dd = document.createElement("dd");
    dd.innerHTML = term.dd;  // HTML挿入可

    // 追加処理: dd の中の append-query を探して href を修正
    dd.querySelectorAll('a.append-query').forEach(link => {
      const href = link.getAttribute('href');

      if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

      const newHref = href.includes('?')
        ? href + '&' + currentParams.slice(1)
        : href + currentParams;

      link.setAttribute('href', newHref);
    });


    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

function appendCurrentQueryToLinks(className) {
  const currentParams = window.location.search;
  if (!currentParams) return;

  document.querySelectorAll('a.' + className).forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    const newHref = href.includes('?')
      ? href + '&' + currentParams.slice(1)
      : href + currentParams;

    link.setAttribute('href', newHref);
  });
}

function renderPagination(data_size, page, page_size, range = 3) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const last_page = Math.ceil(data_size / page_size);
  if (last_page <= 1) return;

  const buttons = [];

  // ▲▲ 先頭へ: ≪
  // buttons.push(_makePageBtn("≪", 1, page === 1));

  // ▲ 前へ: <
  buttons.push(_makePageBtn("<", page - 1, page === 1));

  // ▼ ページ番号生成用
  let start = Math.max(1, page - range);
  let end = Math.min(last_page, page + range);

  // 左寄せ
  if (page <= range + 1) {
    start = 1;
    end = Math.min(last_page, 1 + range * 2);
  }
  // 右寄せ
  if (page >= last_page - range) {
    end = last_page;
    start = Math.max(1, last_page - range * 2);
  }

  // ▼ 最初のページが範囲外なら 1 を表示 + 省略記号 …
  if (start > 1) {
    buttons.push(_makePageBtn(1, 1, false));
    if (start > 2) buttons.push(_makeEllipsis());
  }

  // ▼ 現在ページの前後 range を追加
  for (let i = start; i <= end; i++) {
    const btn = _makePageBtn(i, i, false, i === page);
    buttons.push(btn);
  }

  // ▼ 最後のページが範囲外なら … + 最後のページ
  if (end < last_page) {
    if (end < last_page - 1) buttons.push(_makeEllipsis());
    buttons.push(_makePageBtn(last_page, last_page, false));
  }

  // ▲ 次へ: >
  buttons.push(_makePageBtn(">", page + 1, page === last_page));

  // ▲▲ 最後へ: ≫
  // buttons.push(_makePageBtn("≫", last_page, page === last_page));

  // ▼ DOM追加
  buttons.forEach(btn => pagination.appendChild(btn));
}


function _makePageBtn(label, targetPage, disabled, active=false) {
  const btn = document.createElement("button");
  btn.className = "page-btn";
  btn.textContent = label;
  btn.disabled = disabled;

  if (active) {
    btn.classList.add("active");
  }

  btn.dataset.page = targetPage;

  if (!disabled) {
    btn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", targetPage);
      window.location.href = window.location.pathname + "?" + params.toString();
    });
  }

  return btn;
}

function _makeEllipsis() {
  const span = document.createElement("button");
  span.textContent = "…";
  span.className = "page-ellipsis";
  return span;
}

function tableHeaderFixer() {
	const theadRows = document.querySelectorAll(`table thead tr`);
	let offset = 0;
	theadRows.forEach((row) => {
		const ths = row.querySelectorAll('th');
		ths.forEach((th) => {
			th.style.top = `${offset}px`;
			th.style.zIndex = 100; // 重なり順を調整
		});
		row.style.top = `${offset}px`;
		offset += row.getBoundingClientRect().height;
	});
}


window.tableHeaderFixer = tableHeaderFixer;
window.renderPagination = renderPagination;
window.formatPalmu = formatPalmu;
window.score2coin = score2coin;
window.scoreOrCoin = scoreOrCoin;
window.scoreToString = scoreToString;
window.renderNavis = renderNavis;
window.setRankText = setRankText;
window.loadDefaultValues = loadDefaultValues;
window.saveSessionArgs = saveSessionArgs;
window.setupTooltips = setupTooltips;
window.renderGlossary = renderGlossary;
window.hashChangeGlossary = hashChangeGlossary;
window.saveCustomGuaranteedScores = saveCustomGuaranteedScores;
window.getCandRank = getCandRank;
window.RANK_CUSTOM = RANK_CUSTOM;
window.copyResult = copyResult;
window.onCopyAndRedirect = onCopyAndRedirect;
window.setForGuaranteedScoreCopy = setForGuaranteedScoreCopy;
window.insertGuaranteedScore = insertGuaranteedScore;
window.updateGuaranteedScore = updateGuaranteedScore;
window.updateUrl = updateUrl;
window.applyParamsToFormControls = applyParamsToFormControls;
window.plan2scoreOrcoin = plan2scoreOrcoin;

