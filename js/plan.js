// for plan.html

const PLAN_PREFIX = 'meter_plan_';

// 一週間のプランを計画する
function calculatePlans() {

	const days = parseInt(document.getElementById("days").value);
	const points = parseInt(document.getElementById("points").value);
	const format = document.getElementById("result-format").value;
	const a2 = parseInt(document.getElementById("a2").value);
	const a4 = parseInt(document.getElementById("a4").value);
	const a6 = parseInt(document.getElementById("a6").value);

	_savePlanArgs(days, points, format);

	// 配列で a の値を保持する
	const costMap = {
		1: [1, 0, 0],
		2: [a2],
		4: [a4],
		6: [a6],
	};

	[2, 4, 6].forEach(p => {
		costMap[p].push(score2coin(costMap[p][0], 0, 'normal'));
		costMap[p].push(score2coin(costMap[p][0], 0, 'per3'));
	});

	const rawPlans = [];
  /**
   * 再帰関数：すべての有効なプランを探索する
   * @param {number} dayIndex - 今が何日目か（0からスタート）
   * @param {number[]} currentPlan - 現在のプラン（例：[6,2,2]）
   * @param {number} currentTotalPoints - 現在の合計ポイント数
   */

	function dfs(currentPlan, restDays, restPoints, scorecoin) {
		if (restDays <= 0) {	// 指定日数に達した
			if (restPoints > 0) {
				return ;
			}

			// rawPlans に現在よりも良いものがあるなら追加しない
			for (const [plan, _] of rawPlans) {
				let isBetter = false;
				for (let i = 0; i < currentPlan.length; i++) {
					if (plan[i] > currentPlan[i]) {
						isBetter = true;
					}
				}
				if (!isBetter) {	// 1個も良いところがなかった
					return ;
				}
			}

			rawPlans.push([[...currentPlan], scorecoin]);
			return ;
		}
		let cand = [1, 2, 4, 6];
		if (restDays >= restPoints) {
			cand = [1];
		}

		for (const p of cand) {
			if (currentPlan.length > 0 && currentPlan[currentPlan.length - 1] < p) {
				continue; // 前のポイントより小さいポイントはスキップ
			}

			currentPlan.push(p);
			const cm = costMap[p];
			const sc = [scorecoin[0] + cm[0], scorecoin[1] + cm[1], scorecoin[2] + cm[2]];
			dfs(currentPlan, restDays - 1, restPoints - p, sc);
			currentPlan.pop(p);
		}
	}

	dfs([], days, points, [0, 0, 0]);

	// 結果の表示条件
	const showConds = {
		// livescore, normal, per3, sort_idx
		'coin': [[false, true, false], 1],
		'coin_per3': [[false, false, true], 2],
		'score': [[true, false, false], 0],
		'both': [[true, true, true], 0],
	};

	const showCond = format in showConds ? showConds[format] : showConds['coin'];
	if (!(format in showConds)) {
		document.getElementById("result-format").value = 'coin';
	}

	const rank = selectedRank();
	const sort_idx = showCond[1];
	rawPlans.sort((a, b) => a[1][sort_idx] - b[1][sort_idx]);
	let result = rank + ": " + days + "日で +" + points + "\nプラン";

	// format は coin|score|both のいずれか
	if (showCond[0][0]) {
		result += '\t| スコア';
	}
	if (showCond[0][1]) {
		result += '\t| コイン[改]';
	}
	if (showCond[0][2]) {
		result += '\t| コイン[÷3]';
	}

	for (const [plan, scorecoin] of rawPlans) {

		result += "\n" + plan.join("");
		for (let i = 0; i < showCond[0].length; i++) {
			if (showCond[0][i]) {
				result += '\t| ' + scorecoin[i].toLocaleString();
			}
		}
	}
	document.getElementById("result_daily").value = result;
}


// n 日後に x ポイントの選択除法をセッションに保存する
function _savePlanArgs(days, points, format) {
	const table = [
		['days', days],
		['points', points],
		['format', format],
	];
	saveSessionArgs(PLAN_PREFIX, table);
}

// n 日後に x ポイントの選択除法をセッションから取得する
function loadDefaultPlan() {
	const table = [
		['days', 'days'],
		['points', 'points'],
		['format', 'result-format'],
	];
	loadDefaultValues(PLAN_PREFIX, table);
}

window.calculatePlans = calculatePlans;
window.loadDefaultPlan = loadDefaultPlan;

