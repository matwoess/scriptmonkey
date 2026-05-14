import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const input = "public/icon.svg";
const sizes = [16, 32, 48, 128];
const outputDir = "public";

if (!fs.existsSync(input)) {
	console.error(`Error: ${input} not found!`);
	process.exit(1);
}

const inputStat = fs.statSync(input);

let needsUpdate = false;
for (const size of sizes) {
	const outputFile = path.join(outputDir, `icon${size}.png`);
	if (
		!fs.existsSync(outputFile) ||
		fs.statSync(outputFile).mtimeMs < inputStat.mtimeMs
	) {
		needsUpdate = true;
		break;
	}
}

if (!needsUpdate) {
	console.log("Icons are up to date.");
	process.exit(0);
}

console.log("SVG changed or icons missing. Regenerating PNGs...");

async function generate() {
	for (const size of sizes) {
		const outputFile = path.join(outputDir, `icon${size}.png`);
		await sharp(input).resize(size, size).png().toFile(outputFile);
		console.log(`Created: ${outputFile}`);
	}
	console.log("Done!");
}

generate().catch((err) => {
	console.error(err);
	process.exit(1);
});
