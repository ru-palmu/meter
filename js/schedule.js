
const SCHEDULE_PREFIX = 'meter_schedule_';

// --- 定数 ---
const POINT_OPTIONS = ["+0", "+1", "+2", "+4", "+6", "ス"];

// スキップカードを配布するのは月曜日
const DISTRIBUTE_SKIP_CARDS_DAY = 1; // 月曜日(0)
const DISTRIBUTE_EVENT_DAY = 1; //  イベント終了日

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

  if (isNaN(savedReset)) savedReset = 7;
  if (isNaN(savedSkip)) savedSkip = 0;
  if (isNaN(savedDailyPoint)) savedDailyPoint = 0;
  const savedToday = __getScheduleLocalStorage("today");
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
      const dow = d.getDay()
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

// --- スケジュール表の生成 ---
function generateSchedule() {
  const tbody = document.getElementById("scheduleBody");
  tbody.innerHTML = "";
  const { start, end } = getDateRange();
  let event = false;

  const today = getToday();

  let d = new Date(start);
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
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = dateToStr(oneMonthAgo);
  if (start > oneMonthAgoStr) {
    start = oneMonthAgoStr; // 1ヶ月前からのデータを表示
  }

  let event = false;  // イベントの切り替わりで背景色を変えるためのフラグ

  const d = end;
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
  __setScheduleLocalStorage("today", getToday());

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
  let rank = 0;
  if (dailyPoint >= RANK_UP_POINT) {
    dailyPoint = 0;
    resetDate = 1;
  }
  while (d <= endx) {
    const dstr = dateToStr(d);
    if (!scheduleData[dstr]) {
        scheduleData[dstr] = defaultScheduleDay(dstr);
    }


    if (!skipCard) {
      // 1 デクリメント
      resetDate = (resetDate + MAX_RESET_DATE - 2) % MAX_RESET_DATE + 1;
    }

    if (d.getDay() === DISTRIBUTE_SKIP_CARDS_DAY) {
      skipCount = distributeSkipCards(skipCount);
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

  const endx = new Date(rows[rows.length - 1].children[0].textContent);
  updateTotalsFuture(endx, skipCount, resetDate, dailyPoint);

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
  setupEvents();
  updateTotals();
});

/* vim: set et ts=2 sts=2 sw=2 et: */
