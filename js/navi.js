const cand_rank = ["B1", "B2", "B3", "A1", "A2", "A3", "S"];

// preset から最新の日付を取得. meter.js 読み込み済みと仮定
const latestDate = Object.keys(presets).sort().reverse()[0];

function renderNavis(page, navi_func, navi_rank, _footer) {
	_renderNaviFunc(page, navi_func);
	_renderNaviRank(selectedRank(), navi_rank);
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


