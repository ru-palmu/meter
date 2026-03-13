const cal_debug = false;

const SCHEDULE_PREFIX = 'meter_schedule_';

// --- 定数 ---
const POINT_OPTIONS = ["+0", "+1", "+2", "+4", "+6", "ス"];

const EVENT_COMMON = [
    ['TBC', 'トップバナー', 'トップバナー'],
    ['SUC', 'ステップアップ', 'ステップアップ'],
    ['EDSC', '毎日配信', '毎日配信'],
];


// スキップカードを配布するのは月曜日
const DISTRIBUTE_SKIP_CARDS_DAY = 1; // 月曜日(0)
const DISTRIBUTE_EVENT_DAY = 1; //  イベント終了日

const EVENT_STATE_DOW = 2; // 火曜日(2)にイベントが切り替わる

const MAX_SKIP_CARDS = 10; // スキップカードの最大数

const RANK_UP_POINT = 18; // ランクアップに必要なポイント数
const RANK_KEEP_POINT = 12; // ランクキープに必要なポイント数

const SCHE_DEBUG = false; // デバッグモード（true なら区切り日までの残日数を表示）

const MAX_RESET_DATE = 7; // 区切り日までの日数（スキップカード使わない場合）

// --- グローバル変数 ---
let scheduleData = {}; // localStorage からの読み込み保持

/*
const toggleButton = document.getElementById('toggleButton');
const past = document.getElementById('pastSchedule');
const future = document.getElementById('futureSchedule');

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;

    document.getElementById('scheduleTablePast').style.display = target === 'past' ? '' : 'none';
    document.getElementById('scheduleTable').style.display = target === 'future' ? '' : 'none';
  });
});
*/

function __getScheduleLocalStorage(key) {
  const prefix = SCHEDULE_PREFIX;
  const fullKey = `${prefix}${key}`;
  const value = localStorage.getItem(fullKey);
  if (value) {
    return value;
  }

  return localStorage.getItem(key);
}

function __setScheduleLocalStorage(key, value) {
  const prefix = SCHEDULE_PREFIX;
  const fullKey = `${prefix}${key}`;
  localStorage.setItem(fullKey, value);
}


// 月曜日にスキップカードを2枚配布する
function distributeSkipCards(skipCards) {
  return Math.min(skipCards + 2, MAX_SKIP_CARDS); // 2枚補充
}

// --- 初期設定のロード ---
function loadInitialSettings() {
  const savedSchedule = __getScheduleLocalStorage("scheduleData");
  scheduleData = savedSchedule ? JSON.parse(savedSchedule) : {};

  let savedSkip = parseInt(__getScheduleLocalStorage("skipCards") || "0");
  let savedReset = parseInt(__getScheduleLocalStorage("resetDate") || "7");
  let savedDailyPoint = parseInt(__getScheduleLocalStorage("dailyPoint") || "0");

  let savedRankChange = __getScheduleLocalStorage("rankChange");
  if (savedRankChange != "Down" && savedRankChange != "Keep" && savedRankChange != "Up") {
    savedRankChange = "Keep";
  }

  if (isNaN(savedReset)) savedReset = 7;
  if (isNaN(savedSkip)) savedSkip = 0;
  if (isNaN(savedDailyPoint)) savedDailyPoint = 0;
  const savedToday = __getScheduleLocalStorage("today");
  const todayStr = getToday();

  //////////////////////////////////////////////////////
  // スキップカードの残数と区切り日を最新に調整する
  //////////////////////////////////////////////////////
  if (savedToday && savedToday !== todayStr) {
    // 前に保存した日付が今日と違う場合は、
    // 残数と区切り日を計算しなおし
    const start = new Date(savedToday);
    const end = new Date(getYesterday());

    const ret = updateTotalsFuture(start, end, savedSkip, savedReset, savedDailyPoint, savedRankChange);

    savedSkip = ret[0];
    savedReset = ret[1];
    savedDailyPoint = ret[2];
    savedRankChange = ret[3];
  }

  if (savedDailyPoint > RANK_UP_POINT) {
    savedDailyPoint = RANK_UP_POINT;
  }

  document.getElementById("skipCards").value = savedSkip;
  document.getElementById("resetDate").value = savedReset;
  document.getElementById("dailyPoint").value = savedDailyPoint;
  document.getElementById("rankChange" + savedRankChange).checked = true;
}

const TODAY_DIFF = -0;

// 昨日の日付をyyyy-mm-ddで返す
function getYesterday() {
  return _getDateDiff(TODAY_DIFF + 1);
}

// 今日の日付をyyyy-mm-ddで返す
function getToday() {
  return _getDateDiff(TODAY_DIFF);
}

// n 日前の日付をyyyy-mm-ddで返す
// n=0 なら今日、n=1 なら昨日
// nは正の整数
function _getDateDiff(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToStr(d);
}

// 表示対象の期間を返す
function getDateRange() {
  const today = getToday();
  const start = new Date(today);
  // start.setMonth(start.getMonth() - 2);
  const end = new Date(today);
  end.setMonth(end.getMonth() + 2);
  return { start, end };
}

// yyyy-mm-dd 文字列変換
function dateToStr(d) {
  return d.toISOString().split("T")[0];
}

function createEventSelectors(dateStr, dow, sep) {
  const tdEvent = document.createElement("td");
  tdEvent.className = "td-event-title";
  tdEvent.rowSpan = (dow == sep) ? 7 : (sep + 7 - dow) % 7;
  if (dow != sep) {
    // 前の起点曜日を求める
    const d = new Date(dateStr);
    d.setDate(d.getDate() - ((dow + 7 - sep) % 7));
    dateStr = dateToStr(d);
  }
  tdEvent.id = "fevent_" + dateStr;
  return tdEvent;
}

function createEventSelectorsPast(dateStr, dow, sep) {
  const tdEvent = document.createElement("td");
  tdEvent.className = "td-event-title";
  tdEvent.rowSpan = (dow == sep - 1) ? 7 : ((dow - sep + 8) % 7);
  if (dow != sep) {
    // 前の sep 曜日を求める
    const d = new Date(dateStr);
    d.setDate(d.getDate() - (dow + 7 - sep) % 7);
    dateStr = dateToStr(d);
  }
  tdEvent.id = "pevent_" + dateStr;
  return tdEvent;
}

function _eventOptionTV(ev) {
  let ev_text = ev;
  if (Array.isArray(ev)) {
    if (ev.length == 3) {
      ev_text = ev[2];
      ev = ev[0];
    } else {
      ev_text = ev[1];
      ev = ev[1];
    }
  }
  return { value: ev, text: ev_text };
}


function setupEventTitles() {
  const events_common = EVENT_COMMON;
  for (const td of document.getElementsByClassName("td-event-title")) {
    const dateStr = td.id.replace("pevent_", "").replace("fevent_", "");
    const prefix = td.id[0];
    const events = window.EVENT_TITLES[dateStr] || [];
    if (events.length > 0) {
      const selector_div = document.createElement("div");
      selector_div.className = "event-selector";
      td.appendChild(selector_div);

      const select = document.createElement("select");
      select.className = "event-select";
      select.id = prefix + "event_select_" + dateStr;
      selector_div.appendChild(select);

      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "不参加";
      select.appendChild(defaultOpt);

      [...events, ...events_common].forEach((ev) => {
        const opt = document.createElement("option");
        // リストなら，１番目の要素を使う
        const ev_value = _eventOptionTV(ev);
        opt.value = ev_value.value;
        opt.textContent = ev_value.text;
        select.appendChild(opt);
      })

      const val = __getScheduleLocalStorage("event_" + dateStr);
      if (val) {
        select.value = val;
      }

      td.appendChild(select);

      select.onchange = () => {
        __setScheduleLocalStorage("event_" + dateStr, select.value);
        const ido = ((td.id[0] == 'f') ? "p" : "f") + "event_select_" + dateStr;
        const other_td = document.getElementById(ido);
        if (other_td) {
          other_td.value = select.value;
        }
      }
    }
  }
}




// --- スケジュール表の生成 ---
function generateSchedule() {
  const tbody = document.getElementById("scheduleBody");
  tbody.innerHTML = "";
  const { start, end } = getDateRange();
  let event = false;

  const today = getToday();

  let d = new Date(start);
  let first_row = true;
  while (d <= end) {
    const dateStr = dateToStr(d);
    const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];

    if (!scheduleData[dateStr]) {
      scheduleData[dateStr] = defaultScheduleDay(dateStr);
    }

    const tr = document.createElement("tr");
    if (dateStr === today) {
      tr.classList.add("today"); // 今日の日付にクラスを追加
    } else {
      if (event) {
        tr.classList.add("event1");
      } else {
        tr.classList.add("event0");
      }
    }
    tr.id = "row_" + dateStr;
    if (d.getDay() === DISTRIBUTE_EVENT_DAY) {
      event = !event;
    }

    // 日付
    const tdDate = document.createElement("td");
    tdDate.className = "date";
    tdDate.textContent = dateStr;
    tr.appendChild(tdDate);

    // 曜日
    const tdWeek = document.createElement("td");
    tdWeek.className = "weekday";
    tdWeek.textContent = dow;
    if (d == today) {
        tdWeek.classList.add("today"); // 今日の日付にクラスを追加
    }
    tr.appendChild(tdWeek);

    // イベント
    if (d.getDay() == EVENT_STATE_DOW || first_row) { // 火曜日ならイベント情報を表示
      const tdEvent = createEventSelectors(dateStr, d.getDay(), EVENT_STATE_DOW);
      tr.appendChild(tdEvent);
      first_row = false;
    }

    // スキップカード残数
    const tdSkipRemain = document.createElement("td");
    tdSkipRemain.className = "skipRemain";
    tr.appendChild(tdSkipRemain);
    if (scheduleData[dateStr]?.skipRemain) tdSkipRemain.value = scheduleData[dateStr].skipRemain;

    // ポイント
    const tdPoint = document.createElement("td");
    tdPoint.className = "point";
    const pointSel = document.createElement("select");
    pointSel.className = "point-select";
    POINT_OPTIONS.forEach((pt) => {
      const opt = document.createElement("option");
      opt.value = pt;
      opt.textContent = pt;
      pointSel.appendChild(opt);
    });
    if (scheduleData[dateStr]?.point) pointSel.value = scheduleData[dateStr].point;
    pointSel.addEventListener("change", () => {
      saveSchedule();
      updateTotals();
    });
    pointSel.addEventListener("input", () => {
      saveSchedule();
      updateTotals();
    });
    tdPoint.appendChild(pointSel);
    tr.appendChild(tdPoint);

    // 合計
    const tdTotal = document.createElement("td");
    tdTotal.className = "total";
    tr.appendChild(tdTotal);
    if (scheduleData[dateStr]?.total) tdTotal.value = scheduleData[dateStr].total;

    // ランク
    const tdRank = document.createElement("td");
    tdRank.className = "rank";
    tr.appendChild(tdRank);
    if (scheduleData[dateStr]?.rank) tdTotal.value = scheduleData[dateStr].rank;

    // 区切り日までの残日数
    const tdRestDay= document.createElement("td");
    tdRestDay.className = "restDay";
	if (SCHE_DEBUG) {
      tr.appendChild(tdRestDay);
	}
    if (scheduleData[dateStr]?.restDay) tdRestDay.value = scheduleData[dateStr].restDay;

    // メモ
    const tdMemo = document.createElement("td");
    tdMemo.className = "memo";
    const memoInput = document.createElement("input");
    memoInput.type = "text";
    memoInput.maxLength = 256; // メモの最大文字数
    memoInput.value = scheduleData[dateStr]?.memo || "";
    memoInput.addEventListener("input", () => {
      saveSchedule();
    });
    tdMemo.appendChild(memoInput);
    tr.appendChild(tdMemo);

    tbody.appendChild(tr);

    d.setDate(d.getDate() + 1);
  }
}

function generateSchedulePast() {
  const tbody = document.getElementById("scheduleBodyPast");
  tbody.innerHTML = "";
  const end = new Date(getYesterday()); // 昨日までのスケジュール
  let start = Object.keys(scheduleData).sort()[0];
  const oneMonthAgo = new Date(getToday());
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = dateToStr(oneMonthAgo);
  if (start > oneMonthAgoStr) {
    start = oneMonthAgoStr; // 1ヶ月前からのデータを表示
  }

  let event = false;  // イベントの切り替わりで背景色を変えるためのフラグ

  const d = end;
  let first_row = true;
  while (dateToStr(d) >= start) {
    const dateStr = dateToStr(d);
    const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];

    if (!scheduleData[dateStr]) {
      scheduleData[dateStr] = defaultScheduleDay(dateStr);
    }

    const tr = document.createElement("tr");
    if (true) {
      if (event) {
        tr.classList.add("event1");
      } else {
        tr.classList.add("event0");
      }
    }
    if (d.getDay() === EVENT_STATE_DOW) {
      event = !event;
    }

    // 日付
    const tdDate = document.createElement("td");
    tdDate.className = "date";
    tdDate.textContent = dateStr;
    tr.appendChild(tdDate);

    // 曜日
    const tdWeek = document.createElement("td");
    tdWeek.className = "weekday";
    tdWeek.textContent = dow;
    tr.appendChild(tdWeek);

    // イベント
    if (d.getDay() == EVENT_STATE_DOW - 1 || first_row) { // 月曜日ならイベント情報を表示
      const tdEvent = createEventSelectorsPast(dateStr, d.getDay(), EVENT_STATE_DOW);
      tr.appendChild(tdEvent);
      first_row = false;
    }

    // ポイント
    const tdPoint = document.createElement("td");
    tdPoint.className = "point";
    const pointSel = document.createElement("select");
    pointSel.className = "point-select";
    POINT_OPTIONS.forEach((pt) => {
      const opt = document.createElement("option");
      opt.value = pt;
      opt.textContent = pt;
      pointSel.appendChild(opt);
    });
    if (scheduleData[dateStr]?.point) pointSel.value = scheduleData[dateStr].point;
    pointSel.addEventListener("change", () => {
      saveSchedule();
    });
    tdPoint.appendChild(pointSel);
    tr.appendChild(tdPoint);

    // メモ
    const tdMemo = document.createElement("td");
    tdMemo.className = "memo";
    const memoInput = document.createElement("input");
    memoInput.type = "text";
    memoInput.value = scheduleData[dateStr]?.memo || "";
    memoInput.addEventListener("input", () => {
      saveSchedule();
    });
    tdMemo.appendChild(memoInput);
    tr.appendChild(tdMemo);

    tbody.appendChild(tr);

    d.setDate(d.getDate() - 1);
  }
}

// --- データ保存 ---
// とりま，利用者が設定している通りに保存する
function saveSchedule() {
  const data = {};  // メモリ載せておく用
  const data_for_save = {}; // 全部


  ///////////////////////////////////////////////
  // 未来分
  ///////////////////////////////////////////////
  document.querySelectorAll("#scheduleTable tbody tr").forEach((row) => {
    // 日付
    const dateStr = row.querySelector(".date").textContent;
    if (!data[dateStr]) {
      data[dateStr] = {};
    }

    // デイリーランクポイント
    const point = row.querySelector(".point select")?.value || "";
    if (point) {
      data[dateStr].point = point;
    }

    // 合計
    const total = row.querySelector(".total")?.textContent || "";
    if (total) data[dateStr].total = total;

    // スキップカード残数
    const skipRemain = row.querySelector(".skipRemain")?.textContent || "";
    if (skipRemain) data[dateStr].skipRemain = skipRemain;

    // メモ
    const memo = row.querySelector(".memo input")?.value || "";
    if (memo) {
      data[dateStr].memo = memo;
    }

    if (point != "+1" || memo) {
      data_for_save[dateStr] = { point: point, memo: memo };
    }
  });

  ///////////////////////////////////////////////
  // 過去分
  ///////////////////////////////////////////////
  document.querySelectorAll("#scheduleTablePast tbody tr").forEach((row) => {
    const dateStr = row.querySelector(".date").textContent;
    if (!data[dateStr]) {
      data[dateStr] = {};
    }

    // デイリーランクポイント
    const point = row.querySelector(".point select")?.value || "";
    if (point) {
      data[dateStr].point = point;
    }

    // メモ
    const memo = row.querySelector(".memo input")?.value || "";
    if (memo) {
      data[dateStr].memo = memo;
    }

    if (point != "+1" || memo) {
      data_for_save[dateStr] = { point: point, memo: memo };
    }
  });

  scheduleData = data;
  if (data.length == 0) {
    return ;
  }
  __setScheduleLocalStorage("scheduleData", JSON.stringify(data_for_save));
  __setScheduleLocalStorage("skipCards", document.getElementById("skipCards").value);
  __setScheduleLocalStorage("resetDate", document.getElementById("resetDate").value);
  __setScheduleLocalStorage("dailyPoint", document.getElementById("dailyPoint").value);
  __setScheduleLocalStorage("rankChange", _getSelectedRankChange());
  __setScheduleLocalStorage("today", getToday());
}

function _getSelectedRankChange() {
  const rankChange = document.querySelector("input[name=rankChange]:checked");
  if (rankChange) {
    return rankChange.value;
  }
  return "Keep";
}


function defaultScheduleDay(__dstr) {
    return { point: "+1", memo: "" };
}

function useSkipCard(datestr) {
  // スキップカードの日付かどうかを判定
  return scheduleData[datestr]?.point === "ス";
}

function isSeparationDate(dateStr) {
  // 区切り日かどうか.
  // 残り日数がないか，+18 獲得した
  return scheduleData[dateStr].separator;
}

function getDailyPoint(datestr) {
  if (!scheduleData[datestr]) {
    return 0; // デフォルトは +0
  }

  const pt = scheduleData[datestr].point;
  if (pt == "+1") {
    return +1;
  } else if (pt == "+2") {
    return +2;
  } else if (pt == "+4") {
    return +4;
  } else if (pt == "+6") {
    return +6;
  } else {
    return 0; // スキップカードやその他のポイントは 0 とみなす
  }
}

// 今日を起点として，未来のポイント・ランクを計算する
// @return [skipCount, resetDate, dailyPoint, rankChange];
function updateTotalsFuture(startx, endx, skipCount, resetDate, dailyPoint, rankChange) {
  let d = new Date(startx);

  const selected_rank = selectedRank();
  let rank = RANK_DIC[selected_rank] ?? -5;

  let rank_down = rankChange == "Down";  // ランクダウン直後はランクアップできない
  let rank_status = ''; // SS+ 対応でっせ．

  if (dailyPoint >= RANK_UP_POINT && !rank_down) {
    dailyPoint = 0;
    resetDate = 7;
  }

  while (d <= endx) {
    const dstr = dateToStr(d);
    if (!scheduleData[dstr]) {
        scheduleData[dstr] = defaultScheduleDay(dstr);
    }

    if (d.getDay() === DISTRIBUTE_SKIP_CARDS_DAY) {
      skipCount = distributeSkipCards(skipCount);
    }
    const skipCard = useSkipCard(dstr);
    if (skipCard) {
      if (skipCount >= 0) {
        skipCount--;
      }
    } else {
      resetDate = (resetDate + - 1) % MAX_RESET_DATE;
    }

    dailyPoint += getDailyPoint(dstr);
    scheduleData[dstr].restDay = resetDate;
    scheduleData[dstr].skipRemain = skipCount;
    scheduleData[dstr].total = dailyPoint;
    if (0 <= rank && rank < cand_rank.length) {
        scheduleData[dstr].rank = cand_rank[rank] + rank_status;
    } else {
        scheduleData[dstr].rank = rank
    }

    scheduleData[dstr].separator = false;
    if (resetDate == 0 && !skipCard || dailyPoint >= RANK_UP_POINT && !rank_down) {
      rank_status = '';
      if (dailyPoint >= RANK_UP_POINT && !rank_down) {  // ランクアップ
        if (rank + 1 < cand_rank.length) {
          rank++;
        } else {
          rank_status = '+';
        }
        rankChange = "Up";
      } else if (dailyPoint < RANK_KEEP_POINT) {  // ランクダウン
        if (rank > 0) { // Dランクはそれ以上下がらない
          rank--;
          rank_down = true;
        }
        rankChange = "Down";
      } else { // ランクキープ
        rank_down = false;
        rankChange = "Keep";
      }
      dailyPoint = 0;
      resetDate = MAX_RESET_DATE;
      scheduleData[dstr].separator = true;
    }

    d.setDate(d.getDate() + 1);
  }

  return [skipCount, resetDate, dailyPoint, rankChange];
}

function _clamp(v, min, max, def) {
  if (isNaN(v)) return def;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

// --- 合計・スキップ残数計算、スキップカード残数チェック・エラー表示 ---
function updateTotals() {
  const rows = document.querySelectorAll("#scheduleTable tbody tr");
  let resetDate = parseInt(document.getElementById("resetDate").value);
  resetDate = _clamp(resetDate, 1, MAX_RESET_DATE, 7);

  let skipCount = parseInt(document.getElementById("skipCards").value, 10);
  skipCount = _clamp(skipCount, 0, MAX_SKIP_CARDS, 0);

  let dailyPoint = parseInt(document.getElementById("dailyPoint").value, 10);
  dailyPoint = _clamp(dailyPoint, 0, RANK_UP_POINT, 0);

  let rankChange = _getSelectedRankChange();

  const endx = new Date(rows[rows.length - 1].children[0].textContent);
  updateTotalsFuture(getToday(), endx, skipCount, resetDate, dailyPoint, rankChange);

  for (const row of rows) {
    const dateStr = row.children[0].textContent;
    const pointSel = row.querySelector(".point select");
    const tdTotal = row.querySelector(".total");
    const tdSkipRemain = row.querySelector(".skipRemain");
    const tdRestDay = row.querySelector(".restDay");
    const tdRank = row.querySelector(".rank");

    // pointSel で選択されたポイントを取得
    const point = pointSel ? pointSel.value : "+0";

    if (isSeparationDate(dateStr)) {
      row.classList.add("separator");
      tdTotal.classList.add("reset");
    } else {
      row.classList.remove("separator");
      tdTotal.classList.remove("reset");
    }
    if (point == "ス" && scheduleData[dateStr]?.skipRemain < 0) {
      tdSkipRemain.classList.add("invalid");
    } else {
      tdSkipRemain.classList.remove("invalid");
    }


    tdTotal.textContent = scheduleData[dateStr]?.total;
    tdSkipRemain.textContent = scheduleData[dateStr]?.skipRemain;
    if (tdRestDay) {
      tdRestDay.textContent = scheduleData[dateStr]?.restDay;
    }
    tdRank.textContent = scheduleData[dateStr]?.rank || 0;
  }
}

//////////////////////////////////////////////////////////
// スクショ画像を保存するための関数
//////////////////////////////////////////////////////////
//
//
function __getEventName(day) {
  const d = new Date(day);
  // 前の火曜日を求める
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 7 - EVENT_STATE_DOW) % 7));
  const dateStr = dateToStr(d);
  let ev = __getScheduleLocalStorage("event_" + dateStr);
  const events = window.EVENT_TITLES[dateStr] || [];

  [...events, ...EVENT_COMMON].forEach((e) => {
    const ee =  _eventOptionTV(e);
    if (ee.value == ev) {
      ev = ee.text;
      return ev;
    }
  });

  return ev
}

function makeTdEventBand(nowDay, dow, sep, j) {

  const tdEvent = document.createElement("td");
  tdEvent.className = "event";

  const spanEvent = document.createElement("span");
  spanEvent.className = "event";

  // 月曜日までの帯
  if (dow == "Tue") {
    tdEvent.colSpan = 7 - j;
    spanEvent.classList.add("start");
  }
  if (j == 0) {
    tdEvent.colSpan = (9 - sep - 1) % 7 + 1;
    spanEvent.classList.add("end");
  }

  const ev = __getEventName(nowDay)
  if (ev) {
    spanEvent.textContent = ev;
    tdEvent.appendChild(spanEvent);
  }
  return tdEvent;
}

function svgToImg(svg) {
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.src = url;
  return img;
}

function createArrow(direction, size = 16, strokeColor = 'green', outlineColor = 'white') {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.classList.add("arrow");
  // svg.style.position = "absolute";
  // svg.style.right = "1px";
  // svg.style.top = "50%";
  // svg.style.transform = "translateY(-50%)";

  // 太い縁取り用の線
  function createLine(x1, y1, x2, y2, width, color) {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", width);
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);
  }

  let lines;
  if (direction === "up-right") {
    // 右上矢印
    lines = [
      [2,14,14,2], [10,2,14,2], [14,2,14,6]
    ];
  } else if (direction === "down-right") {
    // 右下矢印
    lines = [
      [2,2,14,14], [10,14,14,14], [14,10,14,14]
    ];
  } else if (direction === "right") {
    // 右矢印
    lines = [
      [0,8,16,8], [10,4,16,8], [10,12,16,8]
    ];
  } else {
    console.error("Unknown arrow direction:", direction);
    return null;
  }

  // 縁取り（太い線）
  lines.forEach(l => createLine(...l, 4, outlineColor));
  // 本体（細い線）
  lines.forEach(l => createLine(...l, 2, strokeColor));
  return svg;
}


function rankMove(nowDay, dstr) {
  if (scheduleData[dstr].total < 12) {
    return ['rank-down', 'down-right', '#c62828'];
  }
  const d1 = new Date(nowDay);
  d1.setDate(d1.getDate() + 1);
  const d1str = dateToStr(d1);
  if (scheduleData[dstr].total >= 18 && (
      scheduleData[d1str]?.rank != scheduleData[dstr]?.rank ||
      scheduleData[dstr]?.rank == 'SS')) {
    return ['rank-up', 'up-right', '#2e7d32'];
  } else {
    // ランクダウン直後なら 18ポイントとってもランクアップできない
    return ['rank-keep', 'right', '#777'];
  }
}


function makeTdRankBand(nowDay, dateStr, today, j) {
  const tdRank = document.createElement("td");
  tdRank.className = "rank";

  let k = 0
  let end = false;
  let classRankMove = null;
  for (k = 0; k < 7 - j; k++) {
    const d = new Date(nowDay);
    d.setDate(d.getDate() + k);
    const dstr = dateToStr(d);
    if (dstr == today && k > 0) {
      k--;
      break;
    }
    if (scheduleData[dstr]?.separator) {
      end = true;
      classRankMove = rankMove(d, dstr);
      tdRank.classList.add("date" + dstr);
      break;
    }
  }
  tdRank.colSpan = k + 1;

  if (scheduleData[dateStr]?.rank) {
    const span = document.createElement("span");
    span.className = "rank";
    span.textContent = scheduleData[dateStr]?.rank;

    tdRank.appendChild(span);

    if (classRankMove) {
      const arrow = createArrow(classRankMove[1], 14);
      const img = svgToImg(arrow);
      img.classList.add('arrow');
      img.classList.add(classRankMove[0]);
      span.classList.add(classRankMove[0]);
      span.appendChild(img);
    }
    if (end) {
      span.classList.add("end");
    }
    const d = new Date(nowDay);
    d.setDate(d.getDate() - 1);
    const dstr = dateToStr(d);
    if (scheduleData[dstr]?.separator || today == dateStr) {
      span.classList.add("start");
    }
  }
  return tdRank;
}

function makeTdPoint(dateStr) {
  const tdPoint = document.createElement("td");
  tdPoint.className = "point";
  const spanPoint = document.createElement("span");
  if (scheduleData[dateStr]?.point) {
    spanPoint.textContent = scheduleData[dateStr].point;
    if (scheduleData[dateStr].total && scheduleData[dateStr].point != "ス") {
      const spanTotal = document.createElement("span");
      spanTotal.className = "total";
      spanTotal.textContent = " (" + scheduleData[dateStr].total;
      // spanPoint.textContent += ", " + scheduleData[dateStr].restDay;
      spanTotal.textContent += ")";
      spanPoint.appendChild(spanTotal);
    }
    spanPoint.className = "point";
    spanPoint.classList.add(scheduleData[dateStr].point.replace("+", "p").replace("ス", "skip"));

    tdPoint.appendChild(spanPoint);
  }
  return tdPoint;
}

function _makeTdMemo(dateStr, isMemo) {
  const tdMemo = document.createElement("td");
  tdMemo.className = "memo";

  const div = document.createElement("div");
  div.className = "memo";
  div.classList.add("text2");

  if (isMemo) {
    const str = scheduleData[dateStr]?.memo || " ";
    if (!str.startsWith(" ") && !str.startsWith("　")) {
      div.textContent = str;
    }
  }
  tdMemo.appendChild(div);

  return tdMemo;
}

function makeCopyright(year) {
	const copyright = document.createElement("div");
  copyright.className = "copyright";

  const imgl = document.createElement("img");
  imgl.src = "img/cal-ru-dl.png";
  imgl.className = "mini-char";
  imgl.classList.add("left");

  const sp = " "; // "\u00A0";
  const sp1 = sp.repeat(5);
  const sp2 = sp.repeat(1);
  const text = document.createTextNode(`ぱ(る)むの計算機 ${sp1} © ${year} ${sp2} (る)`);

  const imgr = document.createElement("img");
  imgr.src = "img/cal-ru-dr.png";
  imgr.className = "mini-char";
  imgr.classList.add("right");

  copyright.appendChild(imgl);
  copyright.appendChild(text);
  copyright.appendChild(imgr);

  return copyright;
}

function formatYYYYMMDD(d) {
  const yy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}/${mm}/${dd}`;

}

function formatMMDD(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

// 1日分の行を作る
// 日付（曜日）・ランク・ポイント・メモ
function makeWeekPngRow(nowDay, isMemo, memoSize) {
  const weekJP = ["日", "月", "火", "水", "木", "金", "土"];
  const weekEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dstr = dateToStr(nowDay);
  const dow = nowDay.getDay();

  const tr = document.createElement("div");
  tr.className = "day-row";

  //////////////////////////////////
  // 日付と曜日
  //////////////////////////////////
  const tdDate = document.createElement("div");
  tdDate.className = "date";
  tdDate.classList.add(weekEN[dow]);
  // mm/dd
  tdDate.textContent = formatMMDD(nowDay);

  const tdWeek = document.createElement("span");
  tdWeek.className = "weekday";
  tdWeek.textContent = ' ' + weekJP[dow];
  tdWeek.classList.add(weekEN[dow]);
  tdDate.appendChild(tdWeek);

  tr.appendChild(tdDate);

  //////////////////////////////////
  // ランク
  //////////////////////////////////
  const tdRank = document.createElement("div");
  tdRank.className = "rank";
  tdRank.textContent = scheduleData[dstr]?.rank || 0;
  tr.appendChild(tdRank);

  if (scheduleData[dstr]?.separator) {
    const classRankMove = rankMove(nowDay, dstr);
    const arrow = createArrow(classRankMove[1], 10, classRankMove[2]);
    const img = svgToImg(arrow);
    arrow.classList.add(classRankMove[0]);
    img.classList.add('arrow');
    img.classList.add(classRankMove[0]);
    tdRank.appendChild(img);
  }


  //////////////////////////////////
  // ポイント
  //////////////////////////////////
  const tdPoint = document.createElement("div");
  tdPoint.className = "point";
  const pointClass = scheduleData[dstr]?.point.replace("+", "p").replace("ス", "skip") || "p1";
  tdPoint.classList.add(pointClass);

  const spanPoint = document.createElement("span");
  spanPoint.className = "daily";
  spanPoint.textContent = scheduleData[dstr]?.point || "+1";
  spanPoint.classList.add(pointClass);
  tdPoint.appendChild(spanPoint);

  const spanTotalPoint = document.createElement("span");
  spanTotalPoint.className = "total";
  if (scheduleData[dstr]?.total) {
    spanTotalPoint.textContent = ' (' + scheduleData[dstr].total + ')';
  }
  tdPoint.appendChild(spanTotalPoint);

  tr.appendChild(tdPoint);


  //////////////////////////////////
  // メモ
  //////////////////////////////////
  const tdMemo = document.createElement("div");
  tdMemo.className = "memo";
  const str = scheduleData[dstr]?.memo || " ";
  if (isMemo && !str.startsWith(" ") && !str.startsWith("　")) {
    tdMemo.textContent = str;
    tdMemo.classList.add(memoSize);
  }
  tr.appendChild(tdMemo);
  return tr;
}

// days 分のスケジュール表
function makeWeekPng(id_canvas, start, days, isMemo, memoSize) {

  const canvas = document.getElementById(id_canvas);
  if (!canvas) {
    return
  }
  canvas.innerHTML = "";

  const div = document.createElement("div");
  div.className = "calendar-wrapper";
  canvas.appendChild(div);

  const title = document.createElement("div");
  title.className = "sch-week-title";
  div.appendChild(title);

  const today = getToday();
  const nowDay = new Date(today);
  if (start > 0) {
    nowDay.setDate(nowDay.getDate() + start);
  }

  const startDay = new Date(nowDay);

  const dayrows = document.createElement("div");
  dayrows.className = "week-day-rows";
  dayrows.style.setProperty('--days', days);
  div.appendChild(dayrows);
  for (let i = 0; i < days; i++) {
    const tr = makeWeekPngRow(nowDay, isMemo, memoSize);
    dayrows.appendChild(tr);

    nowDay.setDate(nowDay.getDate() + 1);
  }

  // 期間をタイトルに設定
  title.textContent = '';
  const span_title_date = document.createElement("span");
  span_title_date.className = "date";
  nowDay.setDate(nowDay.getDate() - 1);
  span_title_date.textContent = `${formatYYYYMMDD(startDay)}〜${formatMMDD(nowDay)}`;
  title.appendChild(span_title_date);

  const span_title_rest = document.createTextNode(" スケジュール");
  title.appendChild(span_title_rest);

  const img2 = document.createElement("img");
  img2.src = "img/cal-ru2.png";
  img2.className = "mini-char-upper-right";
  img2.alt = "ミニキャラ"
  title.appendChild(img2);


	const copyright = makeCopyright(today.slice(0, 4));
  div.appendChild(copyright);
}

/**
 * 4週間分のカレンダー
 * sep: 左端の曜日
 */
function makeMonthPng(id_canvas, sep, weekn, isMemo) {
  const canvas = document.getElementById(id_canvas);
  if (!canvas) {
    return
  }
  canvas.innerHTML = "";

  const div = document.createElement("div");
  div.className = "calendar-wrapper";
  canvas.appendChild(div);

  const title = document.createElement("div");
  title.className = "sch-month-title";
  const today = getToday();

  div.appendChild(title);

  const table = document.createElement("table");
  table.className = "scheduler_month";
  div.appendChild(table);

	const copyright = makeCopyright(today.slice(0, 4));
  div.appendChild(copyright);

  const thead = document.createElement("thead");
  table.appendChild(thead);

  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);

  for (let j = 0; j < 7; j++) {
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][(sep + j) % 7];
    const th = document.createElement("th");
    th.textContent = day;
    th.className = day;
    headerRow.appendChild(th);
  }

  const dow = new Date(today).getDay();
  const nowDay = new Date(today);
  // 火曜日を起点にして、表示する月の最初の火曜日の日付を求める
  nowDay.setDate(nowDay.getDate() - ((dow + 7 - sep) % 7)); // 4週間分前から表示

  let new_rank_week = (7 + dow - sep) % 7;

  for (let i = 0; i < weekn; i++) {
    const trs = {};
    ['date', 'event', 'rank', 'point', 'memo'].forEach((cls) => {
      const tr = document.createElement("tr");
      table.appendChild(tr);
      tr.className = cls;
      trs[cls] = tr;
    });

    for (let j = 0; j < 7; j++) {
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][(sep + j) % 7];
      const tdDate = document.createElement("td");
      const dateStr = dateToStr(nowDay);
      tdDate.textContent = nowDay.getDate();
      tdDate.className = day;
      tdDate.classList.add("date");
      if (dateStr === today) {
        tdDate.classList.add("today");
      } else if (i == 0 && dateStr < today) {
        tdDate.classList.add("past");
      }
      trs['date'].appendChild(tdDate);

      ////////////////////////////////////
      // イベント帯
      ////////////////////////////////////
      if (day == "Tue" || j == 0) {
        const tdEvent = makeTdEventBand(nowDay, day, sep, j);
        trs['event'].appendChild(tdEvent);
      }

      ////////////////////////////////////
      // ポイント
      ////////////////////////////////////
      const tdPoint = makeTdPoint(dateStr);
      trs['point'].appendChild(tdPoint);

      ////////////////////////////////////
      // ランク帯
      ////////////////////////////////////
      if (j == 0 || j == new_rank_week) {
        const tdRankBand = makeTdRankBand(nowDay, dateStr, today, j);
        if (tdRankBand) {
          trs['rank'].appendChild(tdRankBand);
        }
        new_rank_week = j + tdRankBand.colSpan;
        if (new_rank_week > 7) {
          new_rank_week = -1;
        }
        // console.log(j, new_rank_week, dateStr, tdRankBand.colSpan, "pos2");
      }
      if (scheduleData[dateStr]?.separator) {
        // 開始タグ
        new_rank_week = (j + 1) % 7;
      }

      const tdMemo = _makeTdMemo(dateStr, isMemo);
      trs['memo'].appendChild(tdMemo);

      nowDay.setDate(nowDay.getDate() + 1);
    }
  }

  nowDay.setDate(nowDay.getDate() - 1);
  _makeTitle(title, today, nowDay);
}

function _makeTitle(div_title, startDayStr, endDay) {
  const endMonth = endDay.getMonth() + 1;
  const endYear = endDay.getFullYear();
  const startMonth = parseInt(startDayStr.slice(5, 7));
  const startYear = parseInt(startDayStr.slice(0, 4));
  let title = `${startYear}/${String(startMonth).padStart(2, '0')}`;
  if (startYear == endYear) {
    if (startMonth != endMonth) {
      title += `〜${String(endMonth).padStart(2, '0')}`;
    }
  } else {
    title += `〜${endYear}/${String(endMonth).padStart(2, '0')}`;
  }

  const img = document.createElement("img");
  img.src = "img/cal-ru1.png";
  img.className = "mini-char-left";
  img.alt = "ミニキャラ"

  const img2 = document.createElement("img");
  img2.src = "img/cal-ru2.png";
  img2.className = "mini-char-upper-right";
  img2.alt = "ミニキャラ"


  const span = document.createElement("span");
  span.className = "date";
  span.textContent = title;

  const span_sch = document.createTextNode(" スケジュール");

  div_title.textContent = "";
  //div_title.appendChild(img);
  div_title.appendChild(img2);
  div_title.appendChild(span);
  div_title.appendChild(span_sch);
  return title;
}


// --- イベント登録 ---
function setupEvents() {
  // スキップカード残数変更時
  ["skipCards", "resetDate", "dailyPoint"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      saveSchedule();
      updateTotals();
    });
  });

  ["rankChange"].forEach((name) => {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        saveSchedule();
        updateTotals();
      });
    });
  });
}


// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  const toggleDescription = [
      '昨日から順に過去を表示しています',
      '今日から順に未来を表示しています',
  ];

  const toggle = document.getElementById('schedule-toggle');
  const direction = document.getElementById('schedule-direction');
  // 未来（チェック）をデフォルトにする
  toggle.checked = true;
  direction.textContent = toggleDescription[toggle.checked ? 1 : 0];
  toggle.addEventListener('change', function() {

    if (this.checked) {
      // 未来
      document.getElementById('pastScheduleDiv').style.display = 'none';
      document.getElementById('futureScheduleDiv').style.display = 'block';
      direction.textContent = toggleDescription[1];
    } else {
      // 過去
      document.getElementById('pastScheduleDiv').style.display = 'block';
      document.getElementById('futureScheduleDiv').style.display = 'none';
      direction.textContent = toggleDescription[0];
    }

    // アニメーション
    const rows = document.querySelectorAll('.scheduler tr');
    rows.forEach(row => {
      row.style.transform = this.checked ? 'translateY(20px)' : 'translateY(-20px)';
      row.style.opacity = '0';
      setTimeout(() => {
        row.style.transform = 'translateY(0)';
        row.style.opacity = '1';
      }, 50);


      // 【重要】アニメーション完了後にスタイルを完全リセット
      setTimeout(() => {
        row.style.transform = '';
        row.style.opacity = '';
        // 強制的に再描画をトリガー
        row.offsetHeight;
      }, 100);

    });
  });

  loadInitialSettings();
  generateSchedule();
  generateSchedulePast();
  setupEventTitles();
  setupEvents();
  updateTotals();

  // for (let i = 0; i < 1; i++) {
  //   makeMonthPng("div-canvas" + i, i);
  // }
  calInit();
  calTypeChange();
  if (cal_debug) {
    document.getElementById("div-canvas").style.display = "flex";
    makeMonthPng("div-canvas", 0, 5, true);

    document.getElementById("div-canvas2").style.display = "flex";
    makeWeekPng("div-canvas2", 3, 13, true, "medium");
  }
});

function calInit() {
	const select = document.getElementById("cal-start-day");
	const today = new Date();

  const labels = ["今日", "明日", "明後日"];
  const d = new Date(today);
	for (let i = 0; i <= 7; i++) {
		d.setDate(today.getDate() + i);

		const mm = d.getMonth() + 1;
		const dd = d.getDate();

		const label = labels[i] || `${i}日後`;
		const option = document.createElement("option");
		option.value = i;
		option.textContent = `${label} (${mm}/${dd})`;

		if (i === 0) option.selected = true;

		select.appendChild(option);
	}
}

function calTypeChange() {
  const val = document.querySelector('input[name="cal-type"]:checked').value;
  const mode = (val == "month");

  const show = "block";
  document.getElementById("sch-month-group").style.display = (mode ? show : "none");
  document.getElementById("sch-week-group").style.display = (mode ? "none" : show);
}


document.getElementById("btn-cal").addEventListener("click", () => {
  const val = document.querySelector('input[name="cal-type"]:checked').value;
  const isMemo = document.getElementById("cal-memo-enable").checked;
  const targets = [];
  targets.push(["div-canvas", val]);
  if (cal_debug) {
    targets.push(["div-canvas2", val == "month" ? "week" : "month"]);
  }

  const today = getToday();
  if (!scheduleData[today]?.rank) {
    updateTotals();
  }

  targets.forEach(([vid, vv]) => {
    if (vv == "month") {
      const dow = document.getElementById("cal-dow").value;
      const weekn = document.getElementById("cal-month-line").value;
      makeMonthPng(vid, parseInt(dow), parseInt(weekn), isMemo);
    } else {
      const days = document.getElementById("cal-days").value;
      const start = document.getElementById("cal-start-day").value;
      const memoSize = document.getElementById("cal-memo-size").value;
      makeWeekPng(vid, parseInt(start), parseInt(days), isMemo, memoSize);
    }
  });

  if (true) {
    const canvas = document.getElementById("div-canvas");
    const size = document.querySelector('input[name="cal-size"]:checked')?.value;
    if (size != "min") {
      canvas.style.minHeight = "640px";
      canvas.style.aspectRatio = "9 / 16";
    } else {
      canvas.style.minHeight = "auto";
      canvas.style.aspectRatio = "auto";
    }

    canvas.style.display = "flex";
    html2canvas(canvas, {
      scale: 2,
    }).then((canvas) => {

      const resized = document.createElement("canvas");
      resized.width = canvas.width / 2;
      resized.height = canvas.height / 2;

      const ctx = resized.getContext("2d");
      ctx.drawImage(canvas, 0, 0, resized.width, resized.height);

      const imgData = resized.toDataURL("image/png");

      document.getElementById("preview").src = imgData;

      const div = document.getElementById("div-preview-download");
      div.innerHTML = "";
      const button = document.createElement("button");
      button.textContent = "画像を保存";
      div.appendChild(button);
      const span = document.createElement("span");
      span.textContent = "(ダウンロードが始まらない場合は，画像の長押しを利用してください)";
      div.appendChild(span);

      button.addEventListener("click", () => {
        const img = document.getElementById("preview");
        if (!img.src) {
          return;
        }

        const link = document.createElement("a");
        link.href = img.src;

        // ファイル名に日付を追加
        const d = new Date().toISOString().replace(/[-:T]/g, "");
        const datetime = d.slice(0, 8) + '_' + d.slice(8, 14);

        link.download = `ru-schedule-${val}-${datetime}.png`;
        link.click();
      });
    });

    if (!cal_debug) {
      canvas.innerHTML = "";
      canvas.style.display = "none";
    }
  }
});

/* vim: set et ts=2 sts=2 sw=2 et: */
