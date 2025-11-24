

/* ============================
   ▼ 共通データ
============================ */

// const NEWS_ALL = [...window.PALMU_NOTICES, ...window.PALMU_NOTICES_bak];
const NEWS_ALL = window.PALMU_NOTICES;
const NEWS_PER_PAGE = 10;

/* ============================
   ▼ ヘルパー：URL パラメータ読み書き
============================ */
function news_getParams() {
  return new URLSearchParams(window.location.search);
}

function NEWS_buildHref(paramsObj) {
  // paramsObj: { page: number, kind: string, q: string }
  const p = new URLSearchParams();
  if (paramsObj.page) p.set('page', String(paramsObj.page));
  if (paramsObj.kind) p.set('kind', paramsObj.kind);
  if (paramsObj.q) p.set('q', paramsObj.q);
  return window.location.pathname + '?' + p.toString();
}

/* ============================
   ▼ 日付フォーマット (YYYY/MM/DD)
============================ */
function news_formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/* ============================
   ▼ ソート (date 降順)
============================ */
function news_sort(list) {
  return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ============================
   ▼ フィルタ（ローカル処理）
   - NOTE: 実際の画面フィルタは「遷移」で行うため、
     この関数は初期表示（URL パラメータ反映）と再描画用
============================ */
function news_filter(kind, keyword) {
  let result = NEWS_ALL;

  if (kind) {
    result = result.filter(n => n.kind && n.kind.code === kind);
  }
  if (keyword) {
    const k = keyword.trim();
    if (k.length > 0) {
      result = result.filter(n => n.text && n.text.includes(k));
    }
  }

  return news_sort(result);
}


/* ============================
   ▼ テーブル描画（現在の page を渡す）
============================ */
function news_renderPageFromParams(page, kind, q) {
  const list = news_filter(kind, q);
  const p = Math.max(1, Number(page) || 1);

  const start = (p - 1) * NEWS_PER_PAGE;
  const items = list.slice(start, start + NEWS_PER_PAGE);

  const tbody = document.getElementById("news-tbody");
  tbody.innerHTML = "";

  const tpl = document.getElementById("news-row-template");

  for (const n of items) {
    const tr = tpl.content.cloneNode(true);
    tr.querySelector(".news_date").textContent = news_formatDate(n.date);
    tr.querySelector(".news_kind").textContent = n.kind ? n.kind.name : '';
    const textCell = tr.querySelector(".news_text");

    if (n.url) {
      const a = document.createElement('a');
      a.href = n.url;
      a.textContent = n.text || '';
      textCell.appendChild(a);
    } else {
      textCell.appendChild(document.createTextNode(n.text || ''));
    }

    // appendix
    if (n.links && n.links.length > 0) {
        textCell.appendChild(document.createTextNode(' 【'));
        var idx = 0;
        n.links.forEach(l => {
            textCell.appendChild(document.createTextNode(''));
            if (l.file) {
                const a = document.createElement('a');
                a.href = `../data/${l.file}`;
                a.textContent = l.label;
                textCell.appendChild(a);
            } else if (l.url) {
                const a = document.createElement('a');
                a.href = l.url;
                a.textContent = l.label;
                textCell.appendChild(a);
            }
            textCell.appendChild(document.createTextNode(''));
            if (idx < n.links.length - 1) {
              textCell.appendChild(document.createTextNode(', '));
            }
            idx++;
        });
        textCell.appendChild(document.createTextNode('】'));
    }

    tbody.appendChild(tr);
  }

  news_renderPagination(list.length, p, NEWS_PER_PAGE);
}

/* ============================
   ▼ ページネーション
============================ */
function news_renderPagination(totalItems, page, per_page) {
  return window.renderPagination(totalItems, page, per_page);
}

/* ============================
   ▼ フィルタ UI に初期値を反映
   - URL パラメータを読み、input/select に反映する
   - その後テーブルを描画
============================ */
function news_applyParamsToUIAndRender() {
  const params = news_getParams();
  const page = parseInt(params.get('page')) || 1;
  const kind = params.get('kind') || '';
  const q = params.get('q') || '';

  // UI に反映
  const kindsel = document.getElementById("news_filter_kind");
  if (kindsel) kindsel.value = kind;

  const qinput = document.getElementById("news_filter_text");
  if (qinput) qinput.value = q;

  // 描画
  news_renderPageFromParams(page, kind, q);
}

/* ============================
   ▼ イベント：フィルタ変更は「遷移」で行う
   - フィルタ変更時は page=1 にして同じパスへ遷移（フルリロード）
============================ */
document.getElementById("news_filter_kind")
  .addEventListener("change", () => {
    const kind = document.getElementById("news_filter_kind").value || '';
    const q = document.getElementById("news_filter_text").value || '';
    // build URL and navigate (full reload)
    window.location.href = NEWS_buildHref({ page: 1, kind: kind, q: q });
  });

document.getElementById("news_filter_text")
  .addEventListener("keydown", (ev) => {
    // Enter で検索する（フル遷移）
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const kind = document.getElementById("news_filter_kind").value || '';
      const q = document.getElementById("news_filter_text").value || '';
      window.location.href = NEWS_buildHref({ page: 1, kind: kind, q: q });
    }
  });

/* ============================
   ▼ 初期表示（URL のクエリを読み取って描画）
============================ */


// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {
  news_applyParamsToUIAndRender();
  renderNavis("navi_func", "navi_rank", "footer");
});


// vim:set et ts=2 sts=2 sw=2:
