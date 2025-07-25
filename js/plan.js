// 一週間のプランを計画する
function calculatePlans() {
	const days = parseInt(document.getElementById("days").value);
	const points = parseInt(document.getElementById("points").value);
	const a2 = parseInt(document.getElementById("a2").value);
	const a4 = parseInt(document.getElementById("a4").value);
	const a6 = parseInt(document.getElementById("a6").value);

	// 配列で a の値を保持する
	const costMap = {
		1: 1,
		2: a2,
		4: a4,
		6: a6,
	};

	rawPlans = [];
  /**
   * 再帰関数：すべての有効なプランを探索する
   * @param {number} dayIndex - 今が何日目か（0からスタート）
   * @param {number[]} currentPlan - 現在のプラン（例：[6,2,2]）
   * @param {number} currentTotalPoints - 現在の合計ポイント数
   */

	function dfs(currentPlan, restDays, restPoints, score) {
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

			rawPlans.push([[...currentPlan], score]);
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
			dfs(currentPlan, restDays - 1, restPoints - p, score + costMap[p]);
			currentPlan.pop(p);
		}
	}

	dfs([], days, points, 0);

	const rank = selectedRank();
	rawPlans.sort((a, b) => a[1] - b[1]);
	let result = rank + ": " + days + "日で +" + points + "\nプラン";

	const format = document.getElementById("result-format").value;
	if (format == 'score' || format == 'both') {
		result += '\t| スコア';
	}
	if (format != 'score') {
		result += '\t| コイン';
	}

	for (const [plan, score] of rawPlans) {

		result += "\n" + plan.join("");
		if (format == 'score' || format == 'both') {
			result += '\t| ' + score.toLocaleString();
		}
		if (format != 'score') {
			s = score2coin(score);
			result += '\t| ' + s.toLocaleString();
		}
	}
	document.getElementById("result_daily").value = result;
}

