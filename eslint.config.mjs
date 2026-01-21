
import globals from "globals";

// eslint.config.mjs
export default [
  {
    files: ["**/*.js"], // 全ての JS を対象
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
	  globals: {
		...globals.browser,
		...globals.node,
		...globals.es2021,

		// data
		PALMU_NOTICES: "readonly",
		EVENTS_LOCAL: "readonly",

		// meter.js
		presets: "readonly",
		default_rank: "readonly",


		// Chart.js
		Chart: "readonly",

		// navi.js
		cand_rank: "readonly",
		RANK_DIC: "readonly",
		loadDefaultValues: "readonly",
		formatAsK: "readonly",
		formatPalmu: "readonly",
		hashChangeGlossary: "readonly",
		latestDate: "readonly",
		renderGlossary: "readonly",
        renderNavis: "readonly",
		saveSessionArgs: "readonly",
		selectedRank: "readonly",
		setRankText: "readonly",
		setupTooltips: "readonly",
		score2coin: "readonly",
		labelGuaranteedScore: "readonly",
		saveCustomGuaranteedScores: "readonly",
		copyResult: "readonly",
		setScores: "readonly",
	  },
    },
    rules: {
      // 文法・バグ検出中心のルール
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^__|^_$",
        "varsIgnorePattern": "^__|^_$",
	  }],
      "no-undef": "error",
      "no-console": "off",
      "no-debugger": "error",
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-fallthrough": "warn",
      // 必要に応じて追加
    },
  },
];
