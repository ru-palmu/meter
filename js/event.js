
// イベントデータ
const EVENT_ITEM = [
	{"value": "TB", "text": "トプバナ", "long": "トップバナー"},
	{"value": "GoS", "text": "登竜門"},
	{"value": "HYA", "text": "ハフアニ", "long": "ハーフイヤーアニバーサリー"},
	{"value": "FB", "text": "バッジ", "long": "ファンバッジ"},
	{"value": "BD", "text": "誕生日"},
	{"value": "ALL", "text": "大型"},
	{"value": "ETC", "text": "その他"},
];
const EVENT_DIC = {}

const RANK_DIC = {}
for (let i = 0; i < cand_rank.length; i++) {
	RANK_DIC[cand_rank[i]] = i;
}

const PAGE_SIZE = 20; // ページあたりの表示数

// ランクフィルター
const eventSelect = document.getElementById("eventFilter");
const rankSelect = document.getElementById("rankFilter");


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


// ランク追加（先頭に「すべて」）
rankSelect.innerHTML = "";
const defaultRank = document.createElement("option");
defaultRank.value = "";
defaultRank.textContent = "すべて";
rankSelect.appendChild(defaultRank);

cand_rank.forEach(r => {
  const opt = document.createElement("option");
  opt.value = r;
  opt.textContent = r;
  rankSelect.appendChild(opt);
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
  data.forEach(ev => {
    const tr = document.createElement("tr");

	const td_ss = document.createElement("td");
	const btn_ss = document.createElement("button");
	btn_ss.className = "ss-btn";
	btn_ss.textContent = "SS";
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

function _renderEventPagination(data_size, page, page_size) {

  if (data_size > page_size) {
    // pagination
	btns = [];
	if (true) {
	  const btn = document.createElement("button");
	  btn.className = "page-btn";
	  btn.textContent = "«";
	  btn.dataset.page = page - 1;
	  btn.disabled = (page <= 1);
	  btns.push(btn);
	}

	const last_page = Math.ceil(data_size / page_size);
	for (i = 1; i <= last_page; i++) {
	  const btn = document.createElement("button");
	  btn.className = "page-btn";
	  btn.textContent = i;
	  btn.dataset.page = i;
	  if (i === page) {
		btn.classList.add("active");
	  }
	  btns.push(btn);
	}

	if (true) {
	  const btn = document.createElement("button");
	  btn.className = "page-btn";
	  btn.textContent = "»";
	  btn.dataset.page = page + 1;
	  btn.disabled = (page >= last_page);
	  btns.push(btn);
	}

    const pagination = document.getElementById("pagination");
	btns.forEach(btn => {
	  pagination.appendChild(btn);
      btn.addEventListener("click", () => {
        const params = new URLSearchParams(window.location.search);
		params.set("page", btn.dataset.page);
        // 更新したクエリでリダイレクト
        window.location.href = window.location.pathname + "?" + params.toString();
	  });
	});
  }
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

	for (let i = 0; i <= 5; i++) {
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
  data.forEach(ev => {
    const card = document.createElement("div");
    card.className = "event-card";

	const left = document.createElement("div");
	left.className = "event-card-left";

	const h3 = document.createElement("h3");
	const event_jp = EVENT_DIC[ev.event.substring(0, 3)][1] || ev.event;
	h3.textContent = event_jp;
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

function updateUrl() {
  const params = new URLSearchParams(window.location.search);

  // event パラメータの更新
  if (eventSelect.value === "") {
    params.delete("event");
  } else {
    params.set("event", eventSelect.value);
  }

  // rank パラメータの更新
  if (rankSelect.value === "") {
    params.delete("rank");
  } else {
    params.set("rank", rankSelect.value);
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
  const rankVal = params.get("rank") || "";
  const rankIndex = RANK_DIC[rankVal] ?? -1;

  const filtered = events.filter(ev=>{
    const eventMatch = !eventVal || ev.event.substring(0, 3) === eventVal;
	if (!eventMatch) {
		return false;
	}

	if (!rankVal) {
		return true;
	}

	if (RANK_DIC[ev.min] <= rankIndex && rankIndex <= RANK_DIC[ev.max]) {
		return true;
	}
	return false;
  });
  eventSelect.value = eventVal;
  rankSelect.value = rankVal;

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
}

window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  // 初期描画
  applyFilter();

  // フィルターイベント
  eventSelect.addEventListener("change", updateUrl);
  rankSelect.addEventListener("change", updateUrl);
  // トグル切替
  document.getElementById("toggleView").addEventListener("change", updateUrl);

  document.getElementById("modal-close").addEventListener("click", () => {
	  closeModal();
  });

  const overlay = document.getElementById("modal");
  overlay.addEventListener("click", (event) => {
	if (event.target === overlay) {
	  closeModal();
	}
  });

  // Escape キーでモーダルを閉じる
  document.addEventListener("keydown", (event) => {
	console.log(event.key);
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
