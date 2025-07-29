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
    small.textContent = '（確定スコア）';
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
    button.textContent = '📋コピー';
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

function renderNavis(navi_func, navi_rank, _footer) {
	page = _getCurrentPage();
	_renderNaviFunc(page, navi_func);
	_renderNaviRank(selectedRank(), navi_rank);
	insertGuaranteedScore("guaranteed-score");
	appendCurrentQueryToLinks('append-query')
	renderFooter();
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


//////////////////////////////////////////////////
// フッタ部
//////////////////////////////////////////////////

function renderFooter() {
  const footer = document.getElementById("footer");
  if (!footer) return;

  const year = new Date().getFullYear(); // ← 現在の年を取得

  footer.innerHTML = `
    <div class="footer-content">
      © ${year} (る) |
      <a href="https://github.com/ru-palmu/meter/" target="_blank" rel="noopener">GitHub</a>
    </div>
  `;
}

//////////////////////////////////////////////////
// ヘルプ用のツールチップ
//////////////////////////////////////////////////
const glossary = {
	coin: {
		msg: "コイン数は，ライブスコアの 1/3 とし，1 の位を切り上げたものとして計算しています．コメント数や視聴者数などにも応じて変動するため参考値としてご利用ください。",
		page: "coin",
		index: "コインスウ",
		dt: "コイン数",
		dd: "コイン数は，<span class='term' data-term='score'>ライブスコア</span>の 1/3 として計算しています．ライブスコアの算出方法は公開されていないこと，また，コメント数や視聴者数などにも応じて変動するため参考値としてご利用ください。",

	},
	score: {
		msg: "ライブスコアとは，ライバーさんがリスナーさんから受け取る応援を示す指標で，コメントの数や視聴人数、スーパーライクの回数などもスコアに含まれる。",
		page: "score",
		index: "ライブスコア",
		dt: "ライブスコア",
		dd: "ライブスコアとは，ライバーがリスナーから受け取る応援を示す指標です。現在の配信画面の左上に表示され，１分ごとに更新され，24時にリセットされます．" +
		"<p>ライブスコアは，「<span class='term' data-term='coin'>コイン数</span>」「コメント数」「スーパーライク数」「視聴人数」などの応援要素を総合して算出されていますが，そのロジックは公開されていません．" +
"<p><div class='img'><img src='img/score.png' alt='ライブスコアの例' width='20%'></div>" +
"<p>より詳細な情報は，『<a href='https://note.com/palmu/n/nc853285c3db3'>【たいむず（2024/10）】ライブスコアの導入</a> <a href='https://note.com/palmu/n/nc853285c3db3#f469e53e-1e96-4c56-8de5-476f1ed9d6f8'>6. ライブスコアの算出ロジックについて</a>』『<a href='https://intercom.help/light-inc/ja/articles/9941027-%E3%83%A9%E3%82%A4%E3%83%96%E3%82%B9%E3%82%B3%E3%82%A2%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6'>ライブスコアについて</a>』を参照ください．" +
		"",
	},
	border: {
		msg: "保証ボーダーとは，締め時間に関係なく、その日のライブスコアが規定値を上回ると、デイリーランクポイントの「+2」「+4」「+6」の獲得が保証される仕組みです。別名：確定値，確定スコア",
		page: "gborder",
		index: "ホショウボーダー",
		dt: "保証ボーダー (確定スコア, 確定値)",
		dd: "保証ボーダーとは，締め時間に関係なく、その日のライブスコアが規定値を上回ると、<span class='term' data-term='point'>デイリーランクポイント</span>の「+2」「+4」「+6」の獲得が保証される仕組みです。ライバーのプロフィールに表示される「<span class='term' data-term='rank'>ユーザーランク</span>」から、保証ボーダーの値を確認できます．下の場合では，「+2」「+4」「+6」の確定値は，それぞれ，「83.6K」「118K」「160K」です．" +
		"ここで，「K」は「キロ」，つまり，1,000倍の値を表します．「118K」の場合だと，118,000 から 118,999 の間の値を表します．本ツールでは，中央値である，118,500 を採用しています．" +
		"<p><div class='img'><img src='img/border.png' alt='保証ボーダーの例' width='70%'></div>" +
		"<p>なお，本ツールでは，保証ボーダーの値を手動で登録しているため，最新になっていなかったり，間違った値になっている可能性があります．" +
		"不具合報告は，<a href=https://github.com/ru-palmu/meter>GitHub</a> までお願いします．" +
"<p>より詳細な情報は，『<a href='https://note.com/palmu/n/n4eb0cf1c4aa8'>【たいむず(2024/6)】保証ボーダーとスキップカードについて</a>』を参照ください．" +
"",
	},
	rank: {
		msg: "ユーザーランクは，ライバーのプロフィールから確認できます．D〜S までの11段階に分かれています．",
		page: "rank",
		index: "ユーザーランク",
		dt: "ユーザーランク",
		dd: "" +
"<p>ユーザーランクは，D, C1, C2, C3, B1, B2, B3, A1, A2, A3, S の全部で11ランクに分かれています．" +
"（2025年9月より，<a href='https://note.com/palmu/n/nc513b02e0bf6'>14ランク</a>に変更される予定です）" +
"<p>ライバーのユーザーランクはプロフィール（配信画面の左上，ライバーの名前をタップ）から確認できます．" +
"<p><div class='img'><img src='img/profile.png' alt='プロフィールの例' width='70%'></div>" +
"<p>ユーザーランクは，ランク更新期間である 7 日感に獲得した<span class='term' data-term='point'>デイリーランクポイント</span>の合計に応じて" +
"「ランクアップ」「ランクキープ」「ランクダウン」のいずれかの状態になります．" +
"「ランクアップ」には 18 ポイント，「ランクキープ」には 12 ポイントが必要です．" +
"<p>下の画像は，上の画像の「ユーザーランク」を表す「B2ランク」をタップすると表示される画面です．" +
"2日と13時間9分で， +2 を獲得するとランクキープ，+8 を獲得するとランクアップできることを表しています．" +
"ランクアップをめざす場合には，<a href='plan.html' class='append-query'>本ツール: 「プラン」</a>では <strong>3日</strong>と<strong>8ポイント</strong>を入力してください．" +
"<p><div class='img'><img src='img/rankup.png' alt='保証ボーダーの例' width='70%'></div>" +
"より詳細な情報は，『<a href='https://note.com/palmu/n/nff989241c2bf'>「全てのライバーさんへの配信機能の開放」と、「ユーザーランク」機能について</a>』を参照ください．" +
"",
	},
	point: {
		msg: "デイリーランクポイントは，ライバーがライブスコアに応じて獲得するポイントで，ランクキープ・ランクアップの基準となります．",
		page: "point",
		index: "デイリーランクポイント",
		dt: "デイリーランクポイント",
		dd: "デイリーランクポイントは，ライバーがライブスコアに応じて獲得するポイントです．" +
		"配信を行わなければ「+0」，配信を行うと少なくとも「+1」が獲得できます．" +
		"締め時間（00:00）までにボーダー，または，<span class='term' data-term='border'>保証ボーダー</span>を超えると，「+2」「+4」「+6」が獲得できます．" +
"<p>下の画像では，保証ボーダーの 83.6K を超えているため，「+2」が獲得できることを表しています．" +
"また，ボーダー（変動スコア）の 118K を超えているため，緑色で「+4」と表示されていますが，" +
"残り 13時間9分の間でボーダーは上がっていく可能性があり，「+4」が獲得できることは保証されていません．" +
"<p><div class='img'><img src='img/border.png' alt='保証ボーダーの例' width='70%'></div>" +
"より詳細な情報は，『<a href='https://note.com/palmu/n/nff989241c2bf'>アップデート便り(2024/03)</a>』を参照ください．" +
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
    term.addEventListener('click', (e) => {
      // ③ 既にツールチップが表示されていたら、消す（トグル）
      const existing = term.querySelector('.tooltip-box');
      if (existing) {
        existing.remove();
        return;
      }

      // ④ 他のツールチップがあれば消す
      document.querySelectorAll('.tooltip-box').forEach(b => b.remove());

      // ⑤ ツールチップを作って中身を設定し、DOMに追加
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

  // ハッシュが変更されたら、該当する用語をハイライト
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

  sortedTerms = Object.values(glossary).sort((a, b) => {
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
	a.textContent = term.dt;
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
