// ヘッダ部のナビゲーションを管理するスクリプト
// 共通関数的なものも管理


const cand_rank = ["B1", "B2", "B3", "A1", "A2", "A3", "S"];

// preset から最新の日付を取得. meter.js 読み込み済みと仮定
const latestDate = Object.keys(presets).sort().reverse()[0];

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


function setRankText(rank, elementId, prefix, suffix) {
  const sp = document.getElementById(elementId);
  if (sp) {
    sp.textContent = prefix + rank + suffix;
  }
}

//////////////////////////////////////////////////
// ナビゲーションのレンダリング
//////////////////////////////////////////////////

function renderNavis(navi_func, navi_rank, _footer) {
	page = _getCurrentPage();
	_renderNaviFunc(page, navi_func);
	_renderNaviRank(selectedRank(), navi_rank);
}

function _getCurrentPage() {
  const path = location.pathname;
  let filename = path.split('/').pop(); // 最後の要素を取得

  // ルート（/）や末尾がスラッシュだけのパスなら
  if (!filename || filename === '') {
    return 'index';
  }

  // クエリパラメータやアンカーがある場合は無視して、拡張子を除く
  filename = filename.split('?')[0].split('#')[0].split('.')[0];

  return filename || 'index';
}


function _getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// 選択されているランクを取得
function selectedRank() {
  const presetFromURL = _getQueryParam("r");
  let key = default_rank;
  if (presetFromURL && presets[latestDate][presetFromURL]) {
    key = presetFromURL;
  }
  return key;
}

// 機能に関するナビゲーションをレンダリング
// page：現在のページID
// target：ナビゲーションを表示する要素のID
function _renderNaviFunc(page, target) {

	const pages = [
		{ id: "index", name: "メーター", url: "index.html" },
		{ id: "plan", name: "プラン", url: "plan.html" },
		{ id: "history", name: "履歴", url: "history.html" },
		{ id: "about", name: "使い方", url: "about.html" },
	];

	let html = '<ul class="sub-tab-nav">';
	const query = window.location.search;

	for (const p of pages) {
		const cls = (p.id === page ? "active" : "");
		html += `<li class="sub-tab ${cls}"><a href="${p.url}${query}">${p.name}</a></li>`;
	}
	html += '</ul>';
	document.getElementById(target).innerHTML = html;
}


// 各ページ上部のランク選択タブの描画
function _renderNaviRank(selected_rank, target_id) {
  const container = document.getElementById(target_id);
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


