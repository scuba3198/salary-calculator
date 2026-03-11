import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");

const FORBIDDEN = [
	{ label: "Effect.runSync(", pattern: /Effect\.runSync\(/ },
	{ label: "Effect.runPromise(", pattern: /Effect\.runPromise\(/ },
	{ label: "console.log(", pattern: /console\.log\(/ },
	{ label: "console.error(", pattern: /console\.error\(/ },
	// Broad error handling is disallowed in app logic (we enforce globally).
	{ label: "Effect.catchAll(", pattern: /Effect\.catchAll\(/ },
	{ label: "Effect.mapError(", pattern: /Effect\.mapError\(/ },
];

async function* walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile()) yield full;
	}
}

const isSourceFile = (p) => p.endsWith(".ts") || p.endsWith(".tsx");

const violations = [];

for await (const filePath of walk(SRC_DIR)) {
	if (!isSourceFile(filePath)) continue;
	const st = await stat(filePath);
	if (!st.isFile()) continue;

	const text = await readFile(filePath, "utf8");
	for (const rule of FORBIDDEN) {
		const idx = text.search(rule.pattern);
		if (idx !== -1) {
			const before = text.slice(0, idx);
			const line = before.split("\n").length;
			violations.push({ filePath, line, rule: rule.label });
		}
	}
}

if (violations.length > 0) {
	console.error("Forbidden patterns detected:");
	for (const v of violations) {
		console.error(`- ${v.rule} at ${path.relative(ROOT, v.filePath)}:${v.line}`);
	}
	process.exit(1);
}

console.log("Forbidden patterns check passed.");

