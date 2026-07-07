
// イベントデータ
const EVENT_ITEM = [
	{"value": "TB", "text": "トプバナ", "long": "トップバナー"},
	{"value": "GoS", "text": "登竜門"},
	{"value": "HYA", "text": "ハフアニ", "long": "ハーフイヤーアニバーサリー"},
	{"value": "1YA", "text": "１周年", "long": "デビュー１周年"},
	{"value": "FB", "text": "バッジ", "long": "ファンバッジ"},
	{"value": "BD", "text": "誕生日"},
	{"value": "GFT", "text": "オリギフ", "long": "オリジナルギフト"},
	{"value": "ALL", "text": "大型"},
	{"value": "ETC", "text": "その他"},
];
const EVENT_DIC = {}

const PAGE_SIZE = 20; // ページあたりの表示数

// ランクフィルター
const eventSelect = document.getElementById("eventFilter");

eventSelect.innerHTML = "";
const defaultEvent = document.createElement("option");
defaultEvent.value = "";
defaultEvent.textContent = "すべて";
eventSelect.appendChild(defaultEvent);

EVENT_ITEM.forEach(r => {
  const opt = document.createElement("option");
  opt.value = r.value;
  opt.textContent = r.text;
  eventSelect.appendChild(opt);
  EVENT_DIC[r.value] = [r.text, r.long || r.text]; // 辞書に追加
});


const events = EVENTS_LOCAL;

function openModal(imgSrc) {
	const modal = document.getElementById("modal");
	const modalImg = document.getElementById("modal-img");
	modalImg.src = imgSrc;
	modal.style.display = "flex";
}

function closeModal() {
	document.getElementById("modal").style.display = "none";
}


// 表描画
const tbody = document.getElementById("eventTableBody");
function _renderEventTable(data) {
  tbody.innerHTML = "";
  let idx = 0;
  data.forEach(ev => {
    const tr = document.createElement("tr");

	idx += 1
	const td_ss = document.createElement("td");
	const btn_ss = document.createElement("button");
	btn_ss.className = "ss-btn";
	btn_ss.textContent = idx;
	btn_ss.dataset.img = ev.img;
	btn_ss.addEventListener("click", () => {
		const imgSrc = btn_ss.dataset.img;
		if (imgSrc) {
			openModal(imgSrc);
		}
	});
	td_ss.appendChild(btn_ss);
	tr.appendChild(td_ss)

	const td_event = document.createElement("td");
	const event_jp = EVENT_DIC[ev.event.substring(0, 3)][0] || ev.event;
	td_event.className = "event-" + ev.event.substring(0, 3);
	const txt = document.createTextNode(event_jp);
	td_event.appendChild(txt);
	if (ev.title) {
		const small_title = document.createElement("small");
		small_title.textContent = `（${ev.title[1]}）`;
		td_event.appendChild(small_title);
	}
	tr.appendChild(td_event)

    const date = ev.date || "";
    const minMax = `${ev.min ?? ""}〜${ev.max ?? ""}`;

    const group = (ev.group ?? "").substring(2);
    const num = ev.num ?? "";
	const groupnum = (ev.gnum) ? `${ev.gnum} / ` : '';
	const elems = [date, minMax, group, `${groupnum}${num}`];

	[0, 2, 4].forEach(v => {
      const g= ev.rank[v]?.gift.toLocaleString() || "";
	  elems.push(g);
	});

	elems.push(ev.title?.[0] || "");

	elems.forEach(text => {
		const td = document.createElement("td");
		td.textContent = text;
		tr.appendChild(td);
	});

    tbody.appendChild(tr);

  });
}

let chartInstanceEvent = null;

// 欠損区間用の segment 共通関数
function _missingSegmentStyle(datasetIndex) {
  return {
    borderDash: ctx => {
      const { p0DataIndex, p1DataIndex, chart } = ctx;
      const data = chart.data.datasets[datasetIndex].data;
      const v0 = data[p0DataIndex];
      const v1 = data[p1DataIndex];
      return (v0 === null || v1 === null) ? [5, 5] : undefined;
    },
    borderColor: ctx => {
      const { p0DataIndex, p1DataIndex, chart } = ctx;
      const data = chart.data.datasets[datasetIndex].data;
      const v0 = data[p0DataIndex];
      const v1 = data[p1DataIndex];
      return (v0 === null || v1 === null) ? 'gray' : chart.data.datasets[datasetIndex].borderColor;
    }
  };
}

function _renderEventGraph(data) {
	const elem = document.getElementById('chart-event');
	if (!elem) {
		console.warn("chart-history element not found");
		return;
	}
	const ctx = elem.getContext('2d');
	if (!ctx) {
		console.warn("Failed to get context for chart-event");
		return;
	}
	if (chartInstanceEvent) {
		chartInstanceEvent.destroy(); // 既存のチャートを破棄
	}

	// 1 ~ data.length をラベルに設定
	const labels = data.map((ev, i) => {
		return `${i + 1}`;
	});

	// 1-8 位までをグラフに描こうではないか．
	const COLORS = ["red", "blue", "green", "orange", "purple", "brown", "pink"];
	const datasets = [];
	for (let i = 0; i < COLORS.length; i++) {
		const scores = data.map(ev =>
			ev.rank[i] !== undefined ? ev.rank[i].gift : null
		);

		datasets.push({
			label: `${i + 1}位`,
			data: scores,
			borderColor: COLORS[i],
			spanGaps: true,
			segment: _missingSegmentStyle(i),
		});
	}

	chartInstanceEvent = new Chart(ctx, {
		'type': 'line',
		'data': {
			'labels': labels,
			'datasets': datasets,
		},
	});

}

function _renderEventPagination(data_size, page, page_size) {
	return window.renderPagination(data_size, page, page_size);
}

function _eventTitleAndText(title, text) {
	const p = document.createElement("p");

	const strong = document.createElement("strong");
	strong.textContent = title;
	p.appendChild(strong);

	const txt = document.createTextNode('： ' + text);
	p.appendChild(txt);

	return p;
}

function _eventOlRanking(rank) {
	const table = document.createElement("table");
	table.className = "event-ranking-table";

	const tr = document.createElement("tr");
	["#", "🎁", "名前"].forEach(header => {
		const th = document.createElement("th");
		th.textContent = header;
		tr.appendChild(th);
	});
	table.appendChild(tr);

	for (let i = 0; i <= 5 && i < rank.length; i++) {
		const tr = document.createElement("tr");
		[rank[i].rank, rank[i].gift.toLocaleString(), rank[i].name].forEach(text => {
			const td = document.createElement("td");
			td.textContent = text;
			tr.appendChild(td);
		});
		table.appendChild(tr);
	}
	return table;
}

// カード描画
function _renderEventCards(data) {
  const container = document.getElementById("cardView");
  container.innerHTML = "";
  let idx = 0;
  data.forEach(ev => {
    const card = document.createElement("div");
    card.className = "event-card";

	const left = document.createElement("div");
	left.className = "event-card-left";

	idx += 1;

	const h3 = document.createElement("h3");
	const event_jp = EVENT_DIC[ev.event.substring(0, 3)][1] || ev.event;
	h3.textContent = `[${idx}] ${event_jp}`;
	left.appendChild(h3);

	if (ev.title) {
		const title = _eventTitleAndText('タイトル', ev.title[0]);
		left.appendChild(title);
	}

	const date = _eventTitleAndText('開始日', ev.dates[0] || '');
	left.appendChild(date);

	const rank = _eventTitleAndText('ランク', `${ev.min || ''}〜${ev.max || ''}` || '');
	left.appendChild(rank);

	if (ev.group) {
		const group = _eventTitleAndText('グループ', ev.group.substring(2) || '');
		left.appendChild(group);
	}

	let groupnum = '';
	if (ev.gnum) {
		groupnum = `${ev.gnum} / `;
	}
	const num = _eventTitleAndText('参加人数', `${groupnum}${ev.num || ''}` || '');
	left.appendChild(num);

	const ol = _eventOlRanking(ev.rank);
	left.appendChild(ol);

	if (ev.note || '') {
		const note = _eventTitleAndText('備考', ev.note);
		left.appendChild(note);
	}

	const right = document.createElement("div");
	right.className = "event-card-right";

	const img = document.createElement("img");
	img.src = `${ev.img || ''}`;
	img.alt = event_jp + ev.date || '';
	right.appendChild(img);
	img.addEventListener("click", () => {
		const imgSrc = img.src;
		if (imgSrc) {
			openModal(imgSrc);
		}
	});

	card.appendChild(left);
	card.appendChild(right);
    container.appendChild(card);
  });
}

function _updateUrlEvent() {
  const params = new URLSearchParams(window.location.search);

  // event パラメータの更新
  if (eventSelect.value === "") {
    params.delete("event");
  } else {
    params.set("event", eventSelect.value);
  }

  if (document.getElementById("toggleView").checked) {
    params.set("eview", "card");
  } else {
    params.delete("eview");
  }

  // 更新したクエリでリダイレクト
  window.location.href = window.location.pathname + "?" + params.toString();
}

// フィルター処理
function applyFilter(){
  // GET パラメータから絞り込み条件とセレクタの初期値を取得
  const params = new URLSearchParams(window.location.search);
  const eventVal = params.get("event") || "";
  const rankVal = selectedRank();
  const rankIndex = RANK_DIC[rankVal] ?? -1;

  const filtered = events.filter(ev=>{
    const eventMatch = !eventVal || ev.event.substring(0, 3) === eventVal;
	if (!eventMatch) {
		return false;
	}

	if (!rankVal || rankVal == window.RANK_CUSTOM) {
		return true;
	}

	if (RANK_DIC[ev.min] <= rankIndex && rankIndex <= RANK_DIC[ev.max]) {
		return true;
	}
	return false;
  });
  eventSelect.value = eventVal;

  const page_size = parseInt(params.get("page_size")) || PAGE_SIZE;
  let page = 1;
  const data_size = filtered.length;
  if (filtered.length > page_size) {
	  page = parseInt(params.get("page")) || 1;
	  let  start = (page - 1) * page_size;
	  if ((page - 1) * page_size >= filtered.length) {
		  page = 1;
		  params.set("page", page);
		  start = 0;
	  }
	  const end = start + page_size;
	  filtered.splice(0, filtered.length, ...filtered.slice(start, end));
  }
  params.set("page", page);

  const isCard = (params.get("eview") == "card");
  document.getElementById("toggleView").checked = isCard;
  if (isCard) {
    _renderEventCards(filtered);
    document.getElementById("tableView").style.display = "none";
    document.getElementById("cardView").style.display = "block";
  } else {
    _renderEventTable(filtered);
    document.getElementById("tableView").style.display = "block";
    document.getElementById("cardView").style.display = "none";
  }
  _renderEventPagination(data_size, page, page_size);
  _renderEventGraph(filtered);
}

window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  // 初期描画
  applyFilter();

  // フィルターイベント
  eventSelect.addEventListener("change", _updateUrlEvent);
  // トグル切替
  document.getElementById("toggleView").addEventListener("change", _updateUrlEvent);

  document.getElementById("modal-close").addEventListener("click", () => {
	  closeModal();
  });

  const overlay = document.getElementById("modal");
  overlay.addEventListener("click", (event) => {
	// 背景クリックでモーダルを閉じる
	if (event.target == overlay || event.target.id === 'modal' || event.target.classList.contains('modal-overlay')) {
	  closeModal();
	}
  });

  // Escape キーでモーダルを閉じる
  document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
	  closeModal();
	}
  });

  // 下スワイプで画像を閉じる
  // const modal_img = document.getElementById("modal-img");
  // modal_img.addEventListener("touchstart", e => startY = e.touches[0].clientY);
  // modal_img.addEventListener("touchend", e => {
  //   const endY = e.changedTouches[0].clientY;
  //   if (endY - startY > 100) closeModal(); // 下にスワイプで閉じる
  // });
});
