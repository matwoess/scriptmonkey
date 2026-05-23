import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, "fixtures");

const server = http.createServer((req, res) => {
	const urlPath = req.url ? req.url.split("?")[0] : "";
	console.log(`[Fixture Server] Request: ${req.url ?? ""}`);

	let targetFile = urlPath.replace(/^\//, "");
	if (targetFile.endsWith(".user.js")) {
		targetFile = targetFile.replace(".user.js", ".js");
	}

	const filePath = path.join(FIXTURES_DIR, targetFile);

	// Prevent directory traversal
	if (!filePath.startsWith(FIXTURES_DIR)) {
		res.writeHead(403);
		res.end("Forbidden");
		return;
	}

	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404);
			res.end("Not Found");
			return;
		}
		res.writeHead(200, {
			"Content-Type": "application/javascript",
			"Access-Control-Allow-Origin": "*",
		});
		res.end(data);
	});
});

const PORT = 8080;
server.listen(PORT, () => {
	console.log(`[Fixture Server] Running on http://localhost:${PORT}`);
});
