
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

let events = [];

// イベントデータ（例）
fetch('../data/events/events.json')
  .then(response => {
    if (!response.ok) throw new Error("JSON取得失敗");
    return response.json();
  })
  .then(data => {
    events = data;
    applyFilter();  // JSON読み込み後に描画
  })
  .catch(err => {
    console.warn("fetch失敗、ローカル用フォールバックを使用", err);

    // 新しい script タグを作って読み込む
    const script = document.createElement("script");
    script.src = "js/_event_data.js"; // ローカルに置いた JS ファイル
    script.onload = () => {
      // 読み込み完了後に変数を代入
      events = EVENTS_LOCAL;
      applyFilter();
    };
    script.onerror = () => {
      console.error("ローカル JS の読み込みにも失敗しました");
    };
    document.body.appendChild(script);
});

// 表描画
const tbody = document.getElementById("eventTableBody");
function renderTable(data) {
  tbody.innerHTML = "";
  data.forEach(ev => {
    const tr = document.createElement("tr");

	const td_event = document.createElement("td");
	const event_jp = EVENT_DIC[ev.event.substring(0, 3)][0] || ev.event;
	td_event.className = "event-" + ev.event.substring(0, 3);
	td_event.textContent = event_jp;
	tr.appendChild(td_event)

    const date = ev.date || "";
    const minMax = `${ev.min ?? ""}~${ev.max ?? ""}`;
    const num = ev.num ?? "";
    const gift1 = ev.rank[0].gift.toLocaleString() || "";
    const gift3 = ev.rank[2].gift.toLocaleString() || "";
    const gift5 = ev.rank[4].gift.toLocaleString() || "";

	[date, minMax, num, gift1, gift3, gift5].forEach(text => {
		const td = document.createElement("td");
		td.textContent = text;
		tr.appendChild(td);
	});

    tbody.appendChild(tr);
  });
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
function renderCards(data) {
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
		const title = _eventTitleAndText('タイトル', ev.title);
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

	const num = _eventTitleAndText('参加人数', `${ev.num || ''}` || '');
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

	card.appendChild(left);
	card.appendChild(right);
    container.appendChild(card);
  });
}

// フィルター処理
function applyFilter(){
  const eventVal = eventSelect.value;
  const rankVal = rankSelect.value;
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
  renderTable(filtered);
  renderCards(filtered);
}

function _eventToggleView(checked) {
  if (checked) {
    // カードビュー
    document.getElementById("tableView").style.display = "none";
    document.getElementById("cardView").style.display = "block";
  } else {
	// テーブルビュー
    document.getElementById("tableView").style.display = "block";
    document.getElementById("cardView").style.display = "none";
  }
}

// トグル切替
document.getElementById("toggleView").addEventListener("change", e => {
	_eventToggleView(e.target.checked);
});

window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  _eventToggleView(document.getElementById("toggleView").checked);

  // 初期描画
  applyFilter();

  // フィルターイベント
  eventSelect.addEventListener("change", applyFilter);
  rankSelect.addEventListener("change", applyFilter);
});
