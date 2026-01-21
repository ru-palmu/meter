// 特に動的な挙動がないページ用

// HTML パース完了後に発火
window.addEventListener("DOMContentLoaded", () => {
  renderNavis("navi_func", "navi_rank", "footer");
  renderGlossary();
  setupTooltips();
  window.tableHeaderFixer();
});

/////////////////////////////////
// about.html
/////////////////////////////////
if (document.getElementById("glossary")) {
	window.addEventListener("hashchange", () => {
		hashChangeGlossary();
	});
}
