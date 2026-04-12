let cal_debug = ((new URLSearchParams(window.location.search)).get("debug") === "1");

const SCHEDULE_PREFIX = 'meter_schedule_';

// --- 定数 ---
const POINT_OPTIONS = ["+0", "+1", "+2", "+4", "+6", "ス"];

const EVENT_COMMON = [
    ['TBC', 'トップバナー', 'トップバナー'],
    ['SUC', 'ステップアップ', 'ステップアップ'],
    ['EDSC', '毎日配信', '毎日配信'],
];

const file_minichar_targets = ['tl', 'tr'];

const minichar_state = {}
file_minichar_targets.forEach(t => minichar_state[t] = { ratio: 1, size: 100, dx: 0, dy: 0});

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

const DB_NAME = "schedule-cal-files";
const DB_VERSION = 1;
const STORE_NAME = "files";

function _openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // 初回 or バージョンアップ時に呼ばれる
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function _saveFile(key, file) {
  const db = await _openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.put(file, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function _loadFile(key) {
  const db = await _openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

const TODAY_DIFF = +0;

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
      defaultOpt.textContent = "未設定／不参加";
      select.appendChild(defaultOpt);

      select.addEventListener("change", () => {
        if (select.value && select.value != "") {
          select.classList.add("selected");
        } else {
          select.classList.remove("selected");
        }
      });

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
        if (select.value && select.value != "") {
          select.classList.add("selected");
        }
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
    } else if (d.getDay() === EVENT_STATE_DOW) {
        tdWeek.classList.add("event-day"); // イベント切り替わりの日にクラスを追加
    } else if (d.getDay() === 0) {
      tdWeek.classList.add("Sun");
    } else if (d.getDay() === 6) {
      tdWeek.classList.add("Sat");
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
    POINT_OPTIONS.forEach((pt) => {
      const opt = document.createElement("option");
      opt.value = pt;
      opt.textContent = pt;
      pointSel.appendChild(opt);
    });
    if (scheduleData[dateStr]?.point) {
      pointSel.value = scheduleData[dateStr].point;
    } else {
      pointSel.value = "+1";
    }
    pointSel.className = "point-select " + _point2className(pointSel.value);
    pointSel.addEventListener("change", () => {
      saveSchedule();
      updateTotals();
      pointSel.className = "point-select " + _point2className(pointSel.value);
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
    if (d.getDay() === 0) {
      tdWeek.classList.add("Sun");
    } else if (d.getDay() === 6) {
      tdWeek.classList.add("Sat");
    }

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
    POINT_OPTIONS.forEach((pt) => {
      const opt = document.createElement("option");
      opt.value = pt;
      opt.textContent = pt;
      pointSel.appendChild(opt);
    });
    if (scheduleData[dateStr]?.point) {
      pointSel.value = scheduleData[dateStr].point;
    } else {
      pointSel.value = "+1";
    }
    pointSel.className = "point-select " + _point2className(pointSel.value);
    pointSel.addEventListener("change", () => {
      saveSchedule();
      pointSel.className = "point-select " + _point2className(pointSel.value);
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
  if (rank <= 0) {
    rank_down = false; // Dランク以下はランクダウンしないので、常にランクアップ可能
  }
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
        if (rank + 1 < cand_rank.length && cand_rank[rank + 1] != window.RANK_CUSTOM) {
          rank++;
        } else {
          rank_status = '+';
        }
        rankChange = "Up";
      } else if (dailyPoint < RANK_KEEP_POINT) {  // ランクダウン
        if (rank > 0) { // Dランクはそれ以上下がらない
          rank--;
          rank_down = true;
        } else {
          // D は即ランクアップできる
          rank_down = false;
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
    return ['rank-down', 'down-right', '#FF9800'];
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
  // dateStr == dateToStr(nowDay) であることが前提
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
      tdRank.conSpan = k;
      return tdRank;
    }
    if (scheduleData[dstr]?.separator && dstr >= today) {
      // 昨日までは非表示にする
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
      // 矢印をランク帯の最後似追加
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
    if (scheduleData[dstr]?.separator && today != dateStr) {
      span.classList.add("start");
    }
  }
  return tdRank;
}

function _point2className(point) {
  return point.replace("+", "p").replace("ス", "skip");
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
    spanPoint.classList.add(_point2className(scheduleData[dateStr].point));

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

function addMiniCharStyle(parentElement, pngs, classnames) {
  for (let n = pngs.length - 1; n >= 0; n--) {
    if (Math.random() * (n + 1) < 1) {
      addMiniChar(parentElement, [pngs[n][0]], [...classnames, ...pngs[n][1]], 0.2);
      return ;
    }
  }
}

function addMiniCharUser(pos, parentElement, classnames) {
  const file = document.getElementById('cal-upload-' + pos)?.files?.[0];
  if (!file) {
    return ;
  }
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.className = classnames.join(' ');
  parentElement.appendChild(img);

  img.style.maxHeight = 'none';
  img.style.maxWidth = 'none';

  const wh = _renderBoxWH(pos);
  img.style.width = wh[0];
  img.style.height = wh[1];

  const x = document.getElementById('cal-opt-dx-' + pos)?.valueAsNumber ?? 0;
  const y = document.getElementById('cal-opt-dy-' + pos)?.valueAsNumber ?? 0;
  img.style.top = `${y}px`;
  img.style.left = `${x}px`;

  return img;
}

function addMiniChar(parentElement, pngs, classnames, rate) {
  if (Math.random() < rate) {
    return ;
  }

  const img = document.createElement("img");
  img.src = pngs[Math.floor(Math.random() * pngs.length)];
  img.className = classnames.join(' ');
  parentElement.appendChild(img);
  return img;
}

function isMiniCharUserEnabled() {
  const mini_char = document.querySelector("input[name=cal-mini-char]:checked")?.value || "ru";
  return mini_char == "user";
}

function makeCopyright(year, debug_str) {
	const copyright = document.createElement("div");
  copyright.className = "copyright";

  const sp = "\u00A0"; // "\u00A0";
  const sp1 = sp.repeat(2);
  const sp2 = sp.repeat(1);
  const suffix = (cal_debug) ? debug_str : "";
  const text = document.createTextNode(`ぱ(る)むの計算機 ${sp1} © ${year} ${sp2} (る)` + suffix);

  if (!isMiniCharUserEnabled()) {
    addMiniChar(copyright, [
      "img/cal-ru-bl1.png",
      "img/cal-ru-bl2.png",
      "img/cal-ru-bl3.png",
    ], ["mini-char", "left"], 0.2);
    copyright.appendChild(text);
    addMiniChar(copyright, [
      "img/cal-ru-br1.png",
      "img/cal-ru-br2.png",
      "img/cal-ru-br3.png",
      "img/cal-ru-br4.png",
    ], ["mini-char", "right"], 0.2);
  } else {
    // addMiniCharUser("bl", copyright, ["mini-char"]);
    copyright.appendChild(text);
    // addMiniCharUser("br", copyright, ["mini-char"]);
  }

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
function makeWeekPngRow(nowDay, isMemo, memoSize, rank_class) {
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
  if (rank_class) {
    tdRank.classList.add(rank_class + '-after');
  }
  tdRank.textContent = scheduleData[dstr]?.rank || 0;
  tr.appendChild(tdRank);

  let classRankMove = ['', ''];
  if (scheduleData[dstr]?.separator) {
    classRankMove = rankMove(nowDay, dstr);
    const arrow = createArrow(classRankMove[1], 10, classRankMove[2]);
    const img = svgToImg(arrow);
    arrow.classList.add(classRankMove[0]);
    img.classList.add('arrow');
    img.classList.add(classRankMove[0] + "-before");
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
  classRankMove[2] = tr;
  return classRankMove
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
  let nx_class = '';
  for (let i = 0; i < days; i++) {
    const tx = makeWeekPngRow(nowDay, isMemo, memoSize, nx_class);
    dayrows.appendChild(tx[2]);
    nx_class = tx[0];

    nowDay.setDate(nowDay.getDate() + 1);
  }

  nowDay.setDate(nowDay.getDate() - 1);
  _makeWeekTitle(title, startDay, nowDay);
  setTitleIcons(title);

	const copyright = makeCopyright(today.slice(0, 4), id_canvas);
  div.appendChild(copyright);
  setMiniCharUsers(div);
}


function _makeWeekTitle(title, startDay, endDay) {
  title.className = "sch-week-title";
  const span_title_date = document.createElement("span");
  span_title_date.className = "date";
  span_title_date.textContent = `${formatYYYYMMDD(startDay)}〜${formatMMDD(endDay)}`;
  title.appendChild(span_title_date);

  const span_title_rest = document.createTextNode(" スケジュール");
  title.appendChild(span_title_rest);
}

function setMiniCharUsers(canvas) {
  if (!isMiniCharUserEnabled()) {
    return ;
  }
  file_minichar_targets.forEach((pos) => {
    addMiniCharUser(pos, canvas, ['mini-char', 'overlay']);
  });
}

function setTitleIcons(title) {
  if (isMiniCharUserEnabled()) {
    return ;
  }
  addMiniCharStyle(title, [
    ["img/cal-ru-tl1.png", []],
    ["img/cal-ru-tl2.png", ['mini-char2']],
    ["img/cal-ru-tl3.png", ['mini-char3']],
    ["img/cal-ru-tl4.png", ['mini-char4']],
  ], ["mini-char-title-left"]);

  addMiniCharStyle(title, [
    ["img/cal-ru-tr1.png", []],
    ["img/cal-ru-tr2.png", ['mini-char2']],
    ["img/cal-ru-tr3.png", ['mini-char3']],
    ["img/cal-ru-tr4.png", ['mini-char4']],
    ["img/cal-ru-tr5.png", ['mini-char5']],
  ], ["mini-char-title-right"]);
}

/**
 * 4週間分のカレンダー
 * sep: 左端の曜日
 */
function makeMonthPng(id_canvas, start, sep, weekn, isMemo) {
  const canvas = document.getElementById(id_canvas);
  if (!canvas) {
    return
  }
  canvas.innerHTML = "";

  const div = document.createElement("div");
  div.className = "calendar-wrapper";
  canvas.appendChild(div);

  const title = document.createElement("div");
  const today = getToday();

  div.appendChild(title);

  const table = document.createElement("table");
  table.className = "scheduler_month";
  div.appendChild(table);

	const copyright = makeCopyright(today.slice(0, 4), id_canvas);
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

  const nowDay = new Date(today);
  if (start > 0) {
    nowDay.setDate(nowDay.getDate() + start * 7);
  }
  const dow = new Date(nowDay).getDay();
  // 火曜日を起点にして、表示する月の最初の火曜日の日付を求める
  nowDay.setDate(nowDay.getDate() - ((dow + 7 - sep) % 7)); // 4週間分前から表示

  let new_rank_week = (7 + dow - sep) % 7;

  if (cal_debug && false) {
    for (let i = 0; i < 14; i++) {
      const newDay = new Date(nowDay);
      newDay.setDate(newDay.getDate() + i);
      const dddstr = dateToStr(newDay);
      if (scheduleData[dddstr] && dddstr.startsWith("2026-03")) {
        console.log(dddstr, scheduleData[dddstr]);
      }
    }
  }

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
  _makeMonthTitle(title, today, nowDay);

  setTitleIcons(title);
  setMiniCharUsers(div);
}

function _makeMonthTitle(div_title, startDayStr, endDay) {
  // startDayStr: YYYY-MM-DD 形式文字列
  // endDay: Date オブジェクト
  div_title.className = "sch-month-title";
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

  const span = document.createElement("span");
  span.className = "date";
  span.textContent = title;

  const span_sch = document.createTextNode(" スケジュール");

  div_title.textContent = "";
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

function _schedule_tab_display(selector, display) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.style.display = display;
  });
}

function _schedule_tab_changed() {
  const selected = document.querySelector('input[name="sch-tab"]:checked');
  if (selected.id == "sch-tab-month") {
    _schedule_tab_display(".sch-tab-content.image-content .month-content", "block");
    _schedule_tab_display(".sch-tab-content.image-content .week-content", "none");
  } else if (selected.id == "sch-tab-week") {
    _schedule_tab_display(".sch-tab-content.image-content .month-content", "none");
    _schedule_tab_display(".sch-tab-content.image-content .week-content", "block");
  }
}

function _saveOptionTab(gen_image) {
  const option = {'tab': this.id};

  [
    ['cal-dow', 'cal-dow'],
    ['cal-month-line', 'cal-month-line'],
    ['cal-start-day', 'cal-start-day'],
    ['cal-start-week', 'cal-start-week'],
    ['cal-days', 'cal-days'],
    ['cal-memo-size', 'cal-memo-size'],
    ['cal-size-full', 'cal-size'], // radio
    ['cal-week-memo-enable', 'cal-week-memo-enable'],
    ['sch-tab-option', 'sch-tab'],
  ].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.type == "checkbox") {
        option[key] = el.checked;
      } else if (el.type == "radio") {
        const checked = document.querySelector(`input[name="${el.name}"]:checked`);
        option[key] = checked ? checked.id : null;
      } else if (el.type == "select-one") {
        option[key] = el.value;
      } else {
        alert("undefined");
        option[key] = el.value;
      }
    }
  });

  sessionStorage.setItem("scheduleOptionTab", JSON.stringify(option));
  sessionStorage.setItem("scheduleOptionTabGenerateImage", gen_image);
}

function _loadOptionTab() {
  const option = JSON.parse(sessionStorage.getItem("scheduleOptionTab"));
  const gen_image = sessionStorage.getItem("scheduleOptionTabGenerateImage");

  if (option) { // 辞書が存在する場合
    for (const [key, value] of Object.entries(option)) {
      const el = document.getElementById(key);
      if (el) {
        if (el.type == "checkbox") {
          el.checked = value;
        } else if (el.type == "radio") {
          const target = document.getElementById(value);
          if (target) {
            target.checked = true;
          }
        } else if (el.type == "select-one") {
          el.value = value;
        } else {
          el.value = value;
        }
      } else {
        // radio..?
        const radios = document.getElementsByName(key);
        if (radios) {
          radios.forEach(radio => {
            if (radio.id == value) {
              radio.checked = true;
            }
          });
        }
      }
    }
  }
  _schedule_tab_changed();
  if (gen_image && gen_image != "0") {
    generateImage();
  }
  sessionStorage.setItem("scheduleOptionTabGenerateImage", 0);
}

function _loadOptionTabImageUser(pos) {
  ["size", "dx", "dy"].forEach(key => {
    const element_id = `cal-opt-${key}-${pos}`
    const input = document.getElementById(element_id);
    input.value = __getScheduleLocalStorage(element_id) || input.value;
    minichar_state[pos][key] = input.valueAsNumber;
  });
}

function _renderOptionTab() {
  _reanderOptionTabFile();

  _loadOptionTab();

  const tabs = document.querySelectorAll('input[name="sch-tab"]');

  tabs.forEach(tab => tab.addEventListener("change", function() {
    window.gtag('event', 'change_tab', {
      'tab_id': this.id,
      'user_rank': selectedRank("undefined"),
    });
    _saveOptionTab(0);

    // reload...
    const url = new URL(window.location.href);
    window.redirectWithScroll(url);
  }));

  const btn = document.getElementById("sch-tab-close");
  if (btn) {
    btn.addEventListener("click", function() {
      // チェックを外して全部非表示状態にする
      tabs.forEach(tab => {
        tab.checked = false;
      });
    });
  }

  document.getElementById("btn-cal").addEventListener("click", () => {
      _saveOptionTab(1);

      // reload...
      // const url = new URL(window.location.href);
      // window.redirectWithScroll(url);
    generateImage();
  });

  document.getElementById("toggle-note").addEventListener("click", function() {
    const note = document.getElementById("note-text");
    if (note.style.display === "none") {
      note.style.display = "block";
    } else {
      note.style.display = "none";
    }
  });


}

function _renderBoxWH(pos) {
  let w, h;

  if (minichar_state[pos].ratio == 0) {
    minichar_state[pos].ratio = 1;
  }
  if (minichar_state[pos].ratio > 1) {
    w = minichar_state[pos].size;
    h = minichar_state[pos].size / minichar_state[pos].ratio;
  } else {
    h = minichar_state[pos].size;
    w = minichar_state[pos].size * minichar_state[pos].ratio;
  }
  return [w + "px", h + "px"];
}

function _renderBox(pos) {
  const wh = _renderBoxWH(pos);
  const el = document.getElementById(`mini-char-preview-box-${pos}`);

  el.style.width = wh[0];
  el.style.height = wh[1];

  el.style.setProperty("--dx", minichar_state[pos].dx + "px");
  el.style.setProperty("--dy", minichar_state[pos].dy + "px");

  ["size", "dx", "dy"].forEach(key => {
    const element_id = `cal-opt-${key}-${pos}`
    const input = document.getElementById(element_id);
    input.value = Math.round(minichar_state[pos][key]);
    __setScheduleLocalStorage(element_id, input.value);
  });
}

function _reanderOptionTabFile() {

  const canvas = document.getElementById("user-mini-char-preview-canvas");
  const table = document.getElementById("mini-char-upload-table");
  const targets = file_minichar_targets;

  const tr_header = document.createElement("tr");
  table.appendChild(tr_header);
  const th_empty = document.createElement("th");
  tr_header.appendChild(th_empty);
  targets.forEach((pos, idx) => {
    const th = document.createElement("th");
    th.textContent = idx;
    tr_header.appendChild(th);
    th.className = "box " + pos;
  });

  const tr_file = document.createElement("tr");
  table.appendChild(tr_file);

  const th_file = document.createElement("th");
  th_file.textContent = "ファイル";
  tr_file.appendChild(th_file);

  targets.forEach(pos => {
    const td = document.createElement("td");
    td.id = "mini-char-td-" + pos;
    tr_file.appendChild(td);

    const label = document.createElement("label");
    label.className = "file"
    label.id = `cal-upload-label-${pos}`;
    label.textContent = "画像選択";
    td.appendChild(label);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.id = `cal-upload-${pos}`;
    label.appendChild(input);
  });

  [
    ["サイズ", "size", 30, 5, 200, "px"],
    ["位置→", "dx", 0, -200, 200, "px"],
    ["位置↓", "dy", 0, -200, 200, "px"],
  ].forEach(([label, key, val, min, max, _]) => {

    const tr = document.createElement("tr");
    table.appendChild(tr);

    const th = document.createElement("th");
    th.textContent = label;
    tr.appendChild(th);

    targets.forEach(pos => {

    /////////////////////////
    // テーブルセル
    /////////////////////////
    // const label = document.createElement("label");
    // label.className = "file"
    // label.textContent = "画像選択";
    // const input = document.createElement("input");
    // input.type = "file";
    // input.accept = "image/*";
    // input.id = `cal-upload-${pos}`;
    // label.appendChild(input);
    // td.appendChild(label);

      const td = document.createElement("td");
      tr.appendChild(td);

      const input = document.createElement("input");
      input.type = "number";
      input.value = val;
      input.min = min;
      input.max = max;
      input.id = `cal-opt-${key}-${pos}`;
      td.className = "mini-char-opt-input";
      td.appendChild(input);

      input.addEventListener("input", () => {
        minichar_state[pos][key] = Number(input.value);
        _renderBox(pos);
      });
    });
  });


  /////////////////////////
  // プレビューキャンバス
  /////////////////////////
  targets.forEach(pos => {
    const charDiv = document.createElement("div");
    charDiv.className = "character-box " + pos;
    charDiv.id = `mini-char-preview-box-${pos}`;
    charDiv.style.touchAction = "none";
    canvas.appendChild(charDiv);

    charDiv.style.size = minichar_state[pos].size + "px";

    const handleBR = document.createElement("div");
    handleBR.className = "handle br";
    handleBR.id = `mini-char-preview-handle-${pos}`;
    handleBR.style.touchAction = "none";
    charDiv.appendChild(handleBR);

    const scale = 0.4;  // css とあわせること

    charDiv.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("handle")) {
        // 右下のハンドルをドラッグしている場合
        return ;
      }

      let startX = e.clientX;
      let startY = e.clientY;

      let baseX = minichar_state[pos].dx;
      let baseY = minichar_state[pos].dy;

      function move(ev) {

        const mx = (ev.clientX - startX) / scale;
        const my = (ev.clientY - startY) / scale;

        minichar_state[pos].dx = baseX + mx;
        minichar_state[pos].dy = baseY + my;

        _renderBox(pos);
      }

      function up() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      }

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });

    // 右下のハンドル：拡大縮小用
    handleBR.addEventListener("pointerdown", (e) => {

      e.stopPropagation();

      let startX = e.clientX;
      let startSize = minichar_state[pos].size;

      function resize(ev) {

        const dx = (ev.clientX - startX) / scale;

        minichar_state[pos].size = Math.max(10, startSize + dx); // 最小サイズ制限

        _renderBox(pos);
      }

      function up() {
        document.removeEventListener("pointermove", resize);
        document.removeEventListener("pointerup", up);
      }

      document.addEventListener("pointermove", resize);
      document.addEventListener("pointerup", up);
    });

    _loadOptionTabImageUser(pos);
    _renderBox(pos);
  });

  function _showPreviewBox(input, label, pos) {
    const isSet = input.files[0] != null;

    label.textContent = isSet ? input.files[0].name : "なし";

    document.getElementById(`mini-char-preview-box-${pos}`).hidden = !isSet;
    document.getElementById(`mini-char-preview-handle-${pos}`).hidden = !isSet;
    document.getElementById(`mini-char-preview-box-${pos}`).display = (isSet ? "block" : "none");
    document.getElementById(`mini-char-preview-handle-${pos}`).display = (isSet ? "block" : "none");
    return isSet;
  }


  // cal-upload- + pos
  document.querySelectorAll("input[type='file']").forEach(input => {
    const label = document.createElement("span");
    label.textContent = "なし";
    label.className = "filename";
    input.parentNode.after(label);

    const pos = input.id.slice(-2)
    _showPreviewBox(input, label, pos);

    input.addEventListener("change", async () => {
      const isSet = _showPreviewBox(input, label, pos);
      if (!isSet) {
        return ;
      }

      document.getElementById("user-mini-char-preview-parent").style.display = "flex";

      const img = new Image();
      img.onload = () => {
        minichar_state[pos].ratio = img.naturalWidth / img.naturalHeight;
        _renderBox(pos);
      }
      const file = input.files[0];
      img.src = URL.createObjectURL(file);
			// await _saveFile(input.id, file);
    });
  });
}

function _debugTitles(div) {

  // monthly
  [
    ["2025-12-01", "2026-01-15"],
    ["2025-12-01", "2025-12-15"],
    ["2026-03-20", "2026-04-15"],
  ].forEach(([s, e]) => {
    const title = document.createElement("div");
    _makeMonthTitle(title, s, new Date(e));
    setTitleIcons(title);
    div.appendChild(title);
  });

  // weekly
  [
    ["2025-12-28", "2026-01-07"],
    ["2025-12-01", "2025-12-15"],
    ["2026-03-30", "2026-04-05"],
  ].forEach(([s, e]) => {
    const title = document.createElement("div");
    _makeWeekTitle(title, new Date(s), new Date(e));
    setTitleIcons(title);
    div.appendChild(title);
  });


}

function debugTable() {
  const table = document.getElementById("debug-img-table");
  const row = document.createElement("tr");
  table.appendChild(row);

  for (let i = 0; i < 3; i++) {
    const cell = document.createElement("td");
    row.appendChild(cell);

    const div = document.createElement("div");
    div.id = "div-canvas-debug-" + (i + 1);
    div.style.display = "flex";
    div.className = "phone-frame-calendar";
    cell.appendChild(div);

    if (i == 2) {
      const div2 = document.createElement("div");
      div2.className = "calendar-wrapper";
      div.appendChild(div2);
      _debugTitles(div2);
    } else if (i == 0) {
      makeMonthPng(div.id, 0, 0, 5, true);
    } else if (i == 1) {
      makeWeekPng(div.id, 3, 13, true, "medium");
    }
  }
}

function calInit() {
  const today = new Date();
  _calInitStartDay(today, "cal-start-day");
  _calInitStartWeek(today, "cal-start-week");
}

function _calInitStartWeek(today, select_id) {
  const select = document.getElementById(select_id);
  const labels = ["今週", "来週"];
  const d = new Date(today);
  for (let i = 0; i < 4; i++) {
    d.setDate(today.getDate() + i * 7);
    const label = labels[i] || `${i}週間後`;
    const option = document.createElement("option");
    option.value = i;
    option.textContent = label;
    if (i === 0) option.selected = true;

    select.appendChild(option);
  }
}


function _calInitStartDay(today, select_id) {
	const select = document.getElementById(select_id);
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


// カレンダー画像生成処理
function generateImage() {
  const val = document.querySelector('input[name="sch-tab"]:checked').value;
  window.gtag('event', 'debug', {
    'pos': 'schedule_img_generate_button',
    'kind': val,
    'debug': cal_debug ? '1' : '0',
    'user_rank': selectedRank("undefined"),
  });
  if (val != "month" && val != "week") {
    return ;
  }

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

  const size = document.querySelector('input[name="cal-size"]:checked')?.value;
  targets.forEach(([vid, vv]) => {
    if (vv == "month") {
      const dow = document.getElementById("cal-dow").value;
      const start = document.getElementById("cal-start-week").value;
      const weekn = document.getElementById("cal-month-line").value;
      window.gtag('event', 'generate_schedule_img', {
        'cal_type': val,
        'cal_size': size,
        'cal_dow': dow,
        'cal_start_week': start,
        'cal_weekn': weekn,
        'user_rank': selectedRank("undefined"),
      });
      makeMonthPng(vid, parseInt(start), parseInt(dow), parseInt(weekn), isMemo);
    } else {
      const days = document.getElementById("cal-days").value;
      const start = document.getElementById("cal-start-day").value;
      const memoSize = document.getElementById("cal-memo-size").value;
      window.gtag('event', 'generate_schedule_img', {
        'cal_type': val,
        'cal_size': size,
        'cal_days': days,
        'cal_start_day': start,
        'cal_memo-size': memoSize,
        'user_rank': selectedRank("undefined"),
      });
      makeWeekPng(vid, parseInt(start), parseInt(days), isMemo, memoSize);
    }
  });

  if (true) {
    const canvas = document.getElementById("div-canvas");
    if (size != "min") {
      canvas.style.minHeight = "640px";
      canvas.style.aspectRatio = "9 / 16";
    } else {
      canvas.style.minHeight = "auto";
      canvas.style.aspectRatio = "auto";
      canvas.style.paddingTop = "30px";
      canvas.style.paddingBottom = "25px";
    }

    canvas.style.display = "flex";
    html2canvas(canvas, {
      scale: 4,
    }).then((canvas) => {
      const resized = document.createElement("canvas");
      resized.width = canvas.width / 2;
      resized.height = canvas.height / 2;

      const ctx = resized.getContext("2d");
      ctx.drawImage(canvas, 0, 0, resized.width, resized.height);

      const imgData = resized.toDataURL("image/png");

      const previewDiv = document.getElementById("preview")
      previewDiv.src = imgData;
      previewDiv.style.width = "360px";
      previewDiv.style.cursor = "pointer";
      previewDiv.addEventListener("click", () => {
        window.open(imgData, '_blank');
      });

      const wrap = document.getElementById("sch-preview-container");
      wrap.style.display = "inline-block";

      const div = document.getElementById("div-preview-download");
      div.innerHTML = "";
      const button = document.createElement("button");
      button.textContent = "画像を保存";
      button.className = "save-btn";
      div.appendChild(button);
      const span = document.createElement("span");
      span.className = "save-note";
      span.innerHTML = "<strong>注意：</strong>iOS等ダウンロードができない場合は，<br><em>画像の長押し</em>を利用してください";
      div.appendChild(span);

      button.addEventListener("click", () => {
        const img = document.getElementById("preview");
        if (!img.src) {
          return;
        }
        // サイズを小さく表示
        img.style.width = "360px";
        img.classNAme = "preview-img";


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

  calInit();
  _renderOptionTab();

  // for (let i = 0; i < 1; i++) {
  //   makeMonthPng("div-canvas" + i, i);
  // }

  // GET パラメータに debug=1 があればデバッグ用の画像を表示
  if (cal_debug) {
    debugTable();
  }
});

/* vim: set et ts=2 sts=2 sw=2 et: */
