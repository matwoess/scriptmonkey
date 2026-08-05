import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const input = "public/images/icon.svg";
const sizes = [16, 32, 48, 128];
const outputDir = "public/images";
const icoPath = "website/static/img/favicon.ico";
const logoPath = "website/static/img/logo.svg";

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

if (
	!fs.existsSync(icoPath) ||
	fs.statSync(icoPath).mtimeMs < inputStat.mtimeMs
) {
	needsUpdate = true;
}

if (
	!fs.existsSync(logoPath) ||
	fs.statSync(logoPath).mtimeMs < inputStat.mtimeMs
) {
	needsUpdate = true;
}

if (!needsUpdate) {
	console.log("Icons are up to date.");
	process.exit(0);
}

console.log(
	"SVG changed or icons missing. Regenerating PNGs, ICO, and logo.svg...",
);

async function generate() {
	let png128Data;

	for (const size of sizes) {
		const outputFile = path.join(outputDir, `icon${size}.png`);
		const pngBuffer = await sharp(input).resize(size, size).png().toBuffer();
		fs.writeFileSync(outputFile, pngBuffer);
		console.log(`Created: ${outputFile}`);

		if (size === 128) {
			png128Data = pngBuffer;
		}
	}

	if (png128Data) {
		// ICO Header (6 bytes)
		const header = Buffer.alloc(6);
		header.writeUInt16LE(0, 0); // Reserved
		header.writeUInt16LE(1, 2); // Type: 1 for ICO
		header.writeUInt16LE(1, 4); // Number of images

		// Directory Entry (16 bytes)
		const entry = Buffer.alloc(16);
		entry.writeUInt8(128, 0); // Width
		entry.writeUInt8(128, 1); // Height
		entry.writeUInt8(0, 2); // Color count
		entry.writeUInt8(0, 3); // Reserved
		entry.writeUInt16LE(1, 4); // Color planes
		entry.writeUInt16LE(32, 6); // Bits per pixel
		entry.writeUInt32LE(png128Data.length, 8); // Size of PNG data
		entry.writeUInt32LE(6 + 16, 12); // Offset to PNG data

		const icoData = Buffer.concat([header, entry, png128Data]);

		const dir = path.dirname(icoPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.writeFileSync(icoPath, icoData);
		console.log(`Created: ${icoPath}`);
	}

	const logoDir = path.dirname(logoPath);
	if (!fs.existsSync(logoDir)) {
		fs.mkdirSync(logoDir, { recursive: true });
	}
	fs.copyFileSync(input, logoPath);
	console.log(`Created: ${logoPath}`);

	console.log("Done!");
}

generate().catch((err) => {
	console.error(err);
	process.exit(1);
});
