global.window = {};

// presets が定義されているファイルに合わせて変更
require("../../js/meter.js");

let hasError = false;

for (const [date, ranks] of Object.entries(window.presets)) {
    if (date == "20251010") {
        // https://note.com/palmu/n/nafe168ac9dd9
        continue;
    }

    for (const [rank, scores] of Object.entries(ranks)) {
        for (const [point, score] of Object.entries(scores)) {
            if (!isValidScore(score)) {
                console.error(
                    `Invalid score: ${date} ${rank} ${point}: ${score}`
                );
                hasError = true;
            }
        }
    }
}

if (hasError) {
    process.exit(1);
}

function isValidScore(score) {
    if (score < 10000) {
        return true;
    }

    const s = String(score);

    // 10,000以上の場合:
    //   上から4桁目が5
    //   5桁目以降はすべて0
    return s[3] === "5"
        && /^0*$/.test(s.slice(4));
}

// vim: set ts=4 sts=4 sw=4 et:
