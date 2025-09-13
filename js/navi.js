// ヘッダ部のナビゲーションを管理するスクリプト
// 共通関数的なものも管理

const COMMON_PREFIX = 'meter_common_';

const cand_rank = ["D", "C1", "C2", "C3", "B1", "B2", "B3", "A1", "A2", "A3", "A4", "A5", "S", "SS"];

const RANK_DIC = {}
for (let i = 0; i < cand_rank.length; i++) {
	RANK_DIC[cand_rank[i]] = i;
}

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

function formatPalmu(value) {
  if (value < 10000) {
	  return value;
  } else if (value < 1000000) {
	  return formatAsK(value) + "K";
  } else {
	  return (Math.floor(value / 10000) / 100).toFixed(2)+ "M";
  }
}

// ライブスコアに相当するコイン数を算出する．
// ギフトの最小値が 10 のため, 1の位を切り上げ.
function score2coin(score) {
  const coin = score / 3;
  return Math.ceil(coin / 10) * 10;
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


//////////////////////////////////////////////////
// 確定スコアの描画
//////////////////////////////////////////////////

function insertGuaranteedScore(targetId) {
    const container = document.getElementById(targetId);
    if (!container) {
        return;
    }

    // 必要なら中身を初期化
    container.innerHTML = '';

    const outerDiv = document.createElement('div');
    outerDiv.className = 'guaranteed-score';

    // タイトル
    const titleSpan = document.createElement('span');
    titleSpan.textContent = '保証ボーダー ';
    const small = document.createElement('small');
	const formatted = `${latestDate.slice(0, 4)}/${latestDate.slice(4, 6)}/${latestDate.slice(6, 8)}`;
    small.textContent = '（確定スコア，' + formatted + ' ver）';
    titleSpan.appendChild(small);
    outerDiv.appendChild(titleSpan);

    // 入力行
    const values = [
        { id: 'a2', label: '+2', value: 43990 },
        { id: 'a4', label: '+4', value: 84990 },
        { id: 'a6', label: '+6', value: 172990 }
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

        row.appendChild(label);
        row.appendChild(input);
        outerDiv.appendChild(row);
    });

    // コピーボタン
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.textContent = '📋確定スコアをコピー';
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

    container.appendChild(outerDiv);
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
	insertGuaranteedScore("guaranteed-score");
	appendCurrentQueryToLinks('append-query')
	_renderFooter();
	if (typeof PALMU_NOTICES !== "undefined") {
		_renderNotices('notice-banner', PALMU_NOTICES);
	}
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

// 選択されているランクを取得
function selectedRank() {
  const presetFromURL = _getQueryParam("r");
  let key = localStorage.getItem(COMMON_PREFIX + "selected_rank");
  if (!key) {
	  key = default_rank;
  }
  if (presetFromURL && presets[latestDate][presetFromURL]) {
    key = presetFromURL;
  }
  return key;
}

// X へのシェアボタンを生成
function _shareX() {
  // Xでシェアボタンを追加
  const shareLi = document.createElement('li');
  shareLi.className = 'sub-tab share-btn';

  const shareA = document.createElement('a');
  shareA.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent('#palmu 用の確定値までの残コイン数を計算するツール #ぱるむの計算機')}&url=${encodeURIComponent('https://ru-palmu.github.io/meter/')}`;
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
		{ id: "index", name: "メーター", url: "index.html" },
		{ id: "plan", name: "プラン", url: "plan.html" },
		{ id: "history", name: "履歴", url: "history.html" },
		{ id: "schedule", name: "予定表", url: "schedule.html" },
		{ id: "event", name: "イベント", url: "event.html" },
		{ id: "about", name: "使い方", url: "about.html" },
	];

	const query = window.location.search;

    const ul = document.createElement('ul');
	ul.className = 'sub-tab-nav';

	for (const p of pages) {
		const li = document.createElement('li');
		li.className = 'sub-tab';
		if (p.id === page) {
			li.classList.add('active');
		}
		const a = document.createElement('a');
		a.href = `${p.url}${query}`;
		a.textContent = p.name;
		li.appendChild(a);
		ul.appendChild(li);
	}

	const li = _shareX();
	if (li) {
		ul.appendChild(li);
	}

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

  const today = new Date();
  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(today.getDate() + 7);

  // 表示する項目を絞り込み
  const upcoming = notices.filter(n => {
    const noticeDate = new Date(n.date);
    // 日付だけの場合は0時に設定されるため、時刻情報がない場合は1日後の23:59に設定
    if (!n.date.includes('T')) {
      noticeDate.setHours(23, 59, 59, 999);
    }

	if (n.start) {
	  const startDate = new Date(n.start);
	  if (startDate <= today && noticeDate >= oneWeekLater) {
		return true;
	  }
	}

	// console.log([today, noticeDate, oneWeekLater, n.text, today <= noticeDate, noticeDate <= oneWeekLater]);
    return today <= noticeDate && noticeDate <= oneWeekLater;
  });
  if (upcoming.length === 0) {
    banner.style.display = 'none'; // お知らせがない場合は非表示
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
		msg: "コイン数は，ライブスコアの 1/3 とし，1 の位を切り上げたものとして計算しています．コメント数や視聴者数などにも応じて変動するため参考値としてご利用ください．",
		page: "coin",
		index: "コインスウ",
		dt: "コイン数 <small>（ギフト数）</small>",
		dd: "コイン数は，<span class='term' data-term='score'>ライブスコア</span>の 1/3 として計算しています．ライブスコアの算出方法は公開されていないこと，また，コメント数や視聴者数などにも応じて変動するため参考値としてご利用ください．" +
"<p>ライブスコアの算出方法は公開されていないものの，ギフトが最もライブスコアに寄与することは間違いありません．同じ人がたくさんのコインを投げるよりも，多くの人が投げることや，追いギフ・追いコメなどがライブスコアに影響があると言われています．" +
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
"<p>ユーザーランクは，D, C1, C2, C3, B1, B2, B3, A1, A2, A3, S の全部で11ランクに分かれています" +
"（2025年9月より，<a href='https://note.com/palmu/n/nc513b02e0bf6'>14ランク</a>に変更される予定です）．" +
"D が最も低いランクで，S が最も高いランクです．" +
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

window.formatPalmu = formatPalmu;
window.score2coin = score2coin;
window.renderNavis = renderNavis;
window.setRankText = setRankText;
window.loadDefaultValues = loadDefaultValues;
window.saveSessionArgs = saveSessionArgs;
window.setupTooltips = setupTooltips;
window.renderGlossary = renderGlossary;
window.hashChangeGlossary = hashChangeGlossary;

