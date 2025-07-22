
function navi(page, target) {

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

