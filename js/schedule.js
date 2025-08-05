

// --- 定数 ---
const POINT_OPTIONS = ["+0", "+1", "+2", "+4", "+6", "ス"];

// スキップカードを配布するのは月曜日
const DISTRIBUTE_SKIP_CARDS_DAY = 0; // 月曜日(0)
const DISTRIBUTE_EVENT_DAY = 0; //  イベント終了日

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

// 月曜日にスキップカードを2枚配布する
function distributeSkipCards(skipCards) {
  return Math.min(skipCards + 2, MAX_SKIP_CARDS); // 2枚補充
}

// --- 初期設定のロード ---
function loadInitialSettings() {
  const savedSchedule = localStorage.getItem("scheduleData");
  scheduleData = savedSchedule ? JSON.parse(savedSchedule) : {};

  let savedSkip = parseInt(localStorage.getItem("skipCards") || "0");
  let savedReset = parseInt(localStorage.getItem("resetDate") || "7");
  let savedDailyPoint = parseInt(localStorage.getItem("dailyPoint") || "0");
  // const savedToday = localStorage.getItem("today") || "";

  if (isNaN(savedReset)) savedReset = 7;
  if (isNaN(savedSkip)) savedSkip = 0;
  if (isNaN(savedDailyPoint)) savedDailyPoint = 0;
  const savedToday = getYesterday();
  const today = new Date(getToday());

  //////////////////////////////////////////////////////
  // スキップカードの残数と区切り日を最新に調整する
  //////////////////////////////////////////////////////
  if (savedToday && savedToday !== today) {
    // 前に保存した日付が今日と違う場合は、
    // 残数と区切り日を計算しなおし
    const start = new Date(savedToday);
    let d = start;
    while (d < today) {
      const dow = d.getDate()
      const dateStr = dateToStr(d);

      if (dow == DISTRIBUTE_SKIP_CARDS_DAY) {
        // 月曜日ならスキップカードを2枚配布
        savedSkip = distributeSkipCards(savedSkip);
      }
      if (useSkipCard(dateStr)) {
        // スキップカードを使っている日付は、残数を減らす
        savedSkip = Math.max(savedSkip - 1, 0);
      } else {
        // -1 処理のワンライナー
        savedReset = (savedReset + MAX_RESET_DATE - 2) % MAX_RESET_DATE + 1;
        savedDailyPoint += getDailyPoint(dateStr);
        if (savedReset == 1 || savedDailyPoint >= RANK_UP_POINT) {
          savedDailyPoint = 0;
          savedReset = 1;
        }
      }
      d.setDate(d.getDate() + 1);
    }
  }

  document.getElementById("skipCards").value = savedSkip;
  document.getElementById("resetDate").value = savedReset;
  document.getElementById("dailyPoint").value = savedDailyPoint;
}

// 昨日の日付をyyyy-mm-ddで返す
function getYesterday() {
  return _getDateDiff(1);
}

// 今日の日付をyyyy-mm-ddで返す
function getToday() {
  return _getDateDiff(0);
}

// n 日前の日付をyyyy-mm-ddで返す
// n=0 なら今日、n=1 なら昨日
// nは正の整数
function _getDateDiff(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// 表示対象の期間を返す
function getDateRange() {
  const today = new Date();
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

// 火曜始まり（月曜終わり）の週キー（火曜の日付を返す）
function getWeekKey(d) {
  const date = new Date(d);
  const dow = date.getDay();
  // 火曜=2 → shift so 火曜=0 ... 月曜=6
  const delta = (dow + 6) % 7;
  date.setDate(date.getDate() - delta);
  return dateToStr(date);
}

// --- スケジュール表の生成 ---
function generateSchedule() {
  const tbody = document.getElementById("scheduleBody");
  tbody.innerHTML = "";
  const { start, end } = getDateRange();

  weekEvents = {}; // クリア
  today = getToday();

  let d = new Date(start);
  while (d <= end) {
    const dateStr = dateToStr(d);
    const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    const weekKey = getWeekKey(d);    // イベントの表示用：火曜始まりの週キー
    const isFirstOfWeek = dateStr === weekKey;

    if (!scheduleData[dateStr]) {
      scheduleData[dateStr] = defaultScheduleDay(dateStr);
    }

    const tr = document.createElement("tr");
    if (dateStr === today) {
      tr.classList.add("today"); // 今日の日付にクラスを追加
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

    // スキップカード残数
    const tdSkipRemain = document.createElement("td");
    tdSkipRemain.className = "skipRemain";
    tr.appendChild(tdSkipRemain);
    if (scheduleData[dateStr]?.skipRemain) tdSkipRemain.value = scheduleData[dateStr].skipRemain;

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
    memoInput.value = scheduleData[dateStr]?.memo || "";
    memoInput.addEventListener("input", () => {
      saveSchedule();
    });
    tdMemo.appendChild(memoInput);
    tr.appendChild(tdMemo);

    tbody.appendChild(tr);

    d.setDate(d.getDate() + 1);
  }

  // 週イベントを初期反映
  Object.keys(weekEvents).forEach((weekKey) => updateWeekEvents(weekKey));
}

function generateSchedulePast() {
  const tbody = document.getElementById("scheduleBodyPast");
  tbody.innerHTML = "";
  const end = getYesterday(); // 昨日までのスケジュール
  const start1 = Object.keys(scheduleData).sort()[0];

  weekEvents = {}; // クリア
  today = getToday();

  let d = new Date(start1);
  let found = false;
  while (d <= end) {
    const dateStr = dateToStr(d);
    const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    const weekKey = getWeekKey(d);    // イベントの表示用：火曜始まりの週キー
    const isFirstOfWeek = dateStr === weekKey;

    if (!scheduleData[dateStr]) {
      scheduleData[dateStr] = defaultScheduleDay(dateStr);
    }
    const tr = document.createElement("tr");
    if (dateStr === today) {
      tr.classList.add("today"); // 今日の日付にクラスを追加
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

    // スキップカード残数
    const tdSkipRemain = document.createElement("td");
    tdSkipRemain.className = "skipRemain";
    tr.appendChild(tdSkipRemain);
    if (scheduleData[dateStr]?.skipRemain) tdSkipRemain.value = scheduleData[dateStr].skipRemain;

    // 区切り日までの残日数
    const tdRestDay= document.createElement("td");
    tdRestDay.className = "restDay";
    // tr.appendChild(tdRestDay);
    if (scheduleData[dateStr]?.restDay) tdRestDay.value = scheduleData[dateStr].restDay;

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

    d.setDate(d.getDate() + 1);
  }

  // 週イベントを初期反映
  Object.keys(weekEvents).forEach((weekKey) => updateWeekEvents(weekKey));
}

// 同じ週のイベント列を更新（週の火曜だけ編集可、他はテキスト表示）
function updateWeekEvents(weekKey) {
  const rows = document.querySelectorAll("#scheduleTable tbody tr");
  rows.forEach((row) => {
    const dateStr = row.querySelector(".date").textContent;
    if (getWeekKey(dateStr) === weekKey) {
      const tdEvent = row.children[2];
      const isFirstOfWeek = dateStr === weekKey;
      if (!isFirstOfWeek) {
        tdEvent.textContent = weekEvents[weekKey];
      }
    }
  });
}

// --- データ保存 ---
// とりま，利用者が設定している通りに保存する
function saveSchedule() {
  localStorage.setItem("skipCards", document.getElementById("skipCards").value);
  localStorage.setItem("resetDate", document.getElementById("resetDate").value);
  localStorage.setItem("dailyPoint", document.getElementById("dailyPoint").value);
  localStorage.setItem("today", getToday());

  const rows = document.querySelectorAll("#scheduleTable tbody tr");
  const data = {};

  rows.forEach((row) => {
    // 日付
    const dateStr = row.querySelector(".date").textContent;
    if (!data[dateStr]) data[dateStr] = {};

    // デイリーポイント
    const point = row.querySelector(".point select")?.value || "";
    if (point) data[dateStr].point = point;

    // 合計
    const total = row.querySelector(".total")?.textContent || "";
    if (total) data[dateStr].total = total;

    // スキップカード残数
    const skipRemain = row.querySelector(".skipRemain")?.textContent || "";
    if (skipRemain) data[dateStr].skipRemain = skipRemain;

    // メモ
    const memo = row.querySelector(".memo input")?.value || "";
    if (memo) data[dateStr].memo = memo;
  });

  // 週イベントも保存
  Object.keys(weekEvents).forEach((wk) => {
    if (!data[wk]) data[wk] = {};
    data[wk].event = weekEvents[wk];
  });

  scheduleData = data;
  localStorage.setItem("scheduleData", JSON.stringify(data));
}

function defaultScheduleDay(dstr) {
    return { point: "+1", memo: "" };
}

function useSkipCard(datestr) {
  // スキップカードの日付かどうかを判定
  return scheduleData[datestr]?.point === "ス";
}

function isSeparationDate(dateStr) {
  // 区切り日かどうか.
  // 残り日数がないか，+18 獲得した
  return (scheduleData[dateStr].restDay == 1 && !useSkipCard(dateStr)) || scheduleData[dateStr].total >= 18;
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

function updateTotalsFuture(endx, skipCount, resetDate, dailyPoint) {
  const today = getToday();
  let d = new Date(today);
  let skipCard = false;
  resetDate += 1;
  let event = false;
  let rank = 0;
  if (dailyPoint >= RANK_UP_POINT) {
    dailyPoint = 0;
    resetDate = 1;
  }
  while (d <= endx) {
    dstr = dateToStr(d);
    if (!scheduleData[dstr]) {
        scheduleData[dstr] = defaultScheduleDay(dstr);
    }


    if (!skipCard) {
      // 1 デクリメント
      resetDate = (resetDate + MAX_RESET_DATE - 2) % MAX_RESET_DATE + 1;
    }

    scheduleData[dstr].event = event;
    if (d.getDay() === DISTRIBUTE_SKIP_CARDS_DAY) {
      skipCount = distributeSkipCards(skipCount);
    }
    if (d.getDay() === DISTRIBUTE_EVENT_DAY) {
      event = !event;
    }
    skipCard = useSkipCard(dstr);
    if (skipCard) {
      if (skipCount >= 0) {
        skipCount--;
      }
    }

    dailyPoint += getDailyPoint(dstr);
    scheduleData[dstr].restDay = resetDate;
    scheduleData[dstr].skipRemain = skipCount;
    scheduleData[dstr].total = dailyPoint;
    scheduleData[dstr].rank = rank

    if (resetDate == 1 && !skipCard || dailyPoint >= RANK_UP_POINT) {
      if (dailyPoint >= RANK_UP_POINT) {
        rank++;
      } else if (dailyPoint < RANK_KEEP_POINT) {
        rank--;
      }
      dailyPoint = 0;
      resetDate = 1;

    }

    d.setDate(d.getDate() + 1);
  }
}

// --- 合計・スキップ残数計算、スキップカード残数チェック・エラー表示 ---
function updateTotals() {
  const rows = document.querySelectorAll("#scheduleTable tbody tr");
  const resetDate = parseInt(document.getElementById("resetDate").value);
  if (isNaN(resetDate)) resetDate = 7;

  let skipCount = parseInt(document.getElementById("skipCards").value, 10);
  if (isNaN(skipCount)) skipCount = 0;

  let dailyPoint = parseInt(document.getElementById("dailyPoint").value, 10);
  if (isNaN(dailyPoint)) dailyPoint = 0;

  let errorMessages = [];

  const today = new Date(getToday());

  const endx = new Date(rows[rows.length - 1].children[0].textContent);
  updateTotalsFuture(endx, skipCount, resetDate, dailyPoint);

  for (const row of rows) {
    const dateStr = row.children[0].textContent;
    const date = new Date(dateStr);
    const pointSel = row.querySelector(".point select");
    const tdTotal = row.querySelector(".total");
    const tdSkipRemain = row.querySelector(".skipRemain");
    const tdRestDay = row.querySelector(".restDay");
    const tdRank = row.querySelector(".rank");

    if (dateStr != today) {
      if (scheduleData[dateStr]?.event) {
        row.classList.add("event1");
      } else {
        row.classList.add("event0");
      }
    }


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

// --- イベント登録 ---
function setupEvents() {
  // スキップカード残数変更時
  ["skipCards", "resetDate", "dailyPoint"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      saveSchedule();
      updateTotals();
    });
  });
}

// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");

  loadInitialSettings();
  generateSchedule();
  setupEvents();
  updateTotals();
});

/* vim: set et ts=2 sts=2 sw=2 et: */
