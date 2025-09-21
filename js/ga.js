// =====================
// EU判定 + GA/Auto Ads初期化（localStorageキャッシュ対応）
// =====================

// GA/AdSense 設定
const GA_MEASUREMENT_ID = "G-BDZWH7BTKY";
const ADSENSE_CLIENT   = "ca-pub-1005701113779263";

// スクリプトURL
const GA_SCRIPT      = "https://www.googletagmanager.com/gtag/js";
const ADSENSE_SCRIPT = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

// EU 国コードリスト
const EU_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR",
                      "HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"];

// スクリプトを動的に読み込む関数（onloadコールバック対応）
function loadAsyncScript(url, attributes = {}, onload = null) {
  try {
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    for (const [key, value] of Object.entries(attributes)) {
      s.setAttribute(key, value);
    }
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  } catch (e) {
    console.warn("failed to load script:", url, e);
  }
}

// GA初期化
function initGA() {
  try {
    loadAsyncScript(`${GA_SCRIPT}?id=${GA_MEASUREMENT_ID}`);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
  } catch (e) {
    console.warn("initGA failed", e);
  }
}

// 手動広告（<ins>）初期化
function initManualAds() {
  try {
    if (!window.adsbygoogle) return;
    document.querySelectorAll('ins.adsbygoogle').forEach(() => {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){ console.warn(e); }
    });
  } catch (e) {
    console.warn("initManualAds failed", e);
  }
}

// Auto Ads初期化（手動広告を onload で呼ぶ）
function initAutoAds() {
  loadAsyncScript(ADSENSE_SCRIPT, {"data-ad-client": ADSENSE_CLIENT}, initManualAds);
}

// EU判定（IPベース）
async function fetchIsEU() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    console.log("GeoIPデータ:", data.country_name, data.country_code);
    return EU_COUNTRIES.includes(data.country_code);
  } catch(e) {
    console.warn("fetchIsEU failed:", e);
    return false; // 判定失敗時はEU外扱い
  }
}

// 初期化関数（localStorageキャッシュ対応）
async function initAnalytics() {
  let euCached = localStorage.getItem("isEU");
  let isEUFlag;

  if (euCached === null) {
    isEUFlag = await fetchIsEU();
    localStorage.setItem("isEU", isEUFlag ? "yes" : "no");
  } else {
    isEUFlag = (euCached === "yes");
  }

  if (!isEUFlag) {
    // EU外なら GA + Auto Ads 有効化
    initGA();
    initAutoAds();
  }
}

// ページ読み込み時に自動実行
initAnalytics();

