import type { FeedbackPayload } from "../../src/types";

interface ResendEmail {
	from: string;
	to: string;
	subject: string;
	text: string;
	attachments?: { filename: string; content: string }[];
}

const MAX_MESSAGE = 5_000;
const MAX_SCRIPT = 200_000;

const isString = (v: unknown): v is string => typeof v === "string";

/** Validates an untrusted request body, returning the payload or an error message. */
export function parseFeedback(body: unknown): FeedbackPayload | string {
	if (typeof body !== "object" || body === null) return "Invalid body";
	const { message, version, userAgent, script } = body as Record<
		string,
		unknown
	>;
	if (!isString(message) || !message.trim()) return "Message is required";
	if (message.length > MAX_MESSAGE) return "Message too long";
	if (!isString(version) || version.length > 32) return "Invalid version";
	if (!isString(userAgent) || userAgent.length > 512)
		return "Invalid user agent";

	const payload: FeedbackPayload = {
		message: message.trim(),
		version,
		userAgent,
	};

	if (script !== undefined) {
		const { filename, source } = script as Record<string, unknown>;
		if (!isString(filename) || filename.length > 256 || !isString(source))
			return "Invalid script";
		if (source.length > MAX_SCRIPT) return "Script too large";
		payload.script = { filename, source };
	}

	return payload;
}

/** Matches an origin against an allow-list; entries ending in `*` match by prefix. */
export function isAllowedOrigin(origin: string | null, allowed: string[]) {
	if (!origin) return false;
	return allowed.some((entry) =>
		entry.endsWith("*")
			? origin.startsWith(entry.slice(0, -1))
			: entry === origin,
	);
}

/** Builds the Resend API request body for a feedback payload. */
export function buildEmail(
	payload: FeedbackPayload,
	from: string,
	to: string,
): ResendEmail {
	const firstLine = payload.message.split("\n")[0].slice(0, 60);
	const attachments: { filename: string; content: string }[] = [];
	if (payload.script) {
		attachments.push({
			filename: payload.script.filename,
			content: Buffer.from(payload.script.source).toString("base64"),
		});
	}
	return {
		from,
		to,
		subject: `[Scriptmonkey v${payload.version}] ${firstLine}`,
		text: `${payload.message}\n\n---\nVersion: ${payload.version}\nUser agent: ${payload.userAgent}`,
		...(attachments.length && { attachments }),
	};
}

function allowedOrigins() {
	return (process.env.ALLOWED_ORIGINS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function corsHeaders(origin: string): HeadersInit {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	};
}

/** Sends the validated feedback payload via the Resend API. */
export async function sendFeedbackEmail(
	payload: FeedbackPayload,
	apiKey: string,
	from: string,
	to: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(buildEmail(payload, from, to)),
	});
	if (!res.ok) {
		const text = await res.text();
		return { ok: false, status: res.status, error: text };
	}
	return { ok: true, status: 200 };
}

export function OPTIONS(request: Request): Response {
	const origin = request.headers.get("Origin");
	if (!origin || !isAllowedOrigin(origin, allowedOrigins()))
		return new Response(null, { status: 403 });
	return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request): Promise<Response> {
	const origin = request.headers.get("Origin");
	if (!origin || !isAllowedOrigin(origin, allowedOrigins()))
		return new Response("Forbidden", { status: 403 });
	const headers = corsHeaders(origin);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response("Invalid JSON", { status: 400, headers });
	}
	const payload = parseFeedback(body);
	if (typeof payload === "string")
		return new Response(payload, { status: 400, headers });

	const { RESEND_API_KEY, FEEDBACK_FROM, FEEDBACK_TO } = process.env;
	if (!RESEND_API_KEY || !FEEDBACK_FROM || !FEEDBACK_TO)
		return new Response("Server not configured", { status: 500, headers });

	const result = await sendFeedbackEmail(
		payload,
		RESEND_API_KEY,
		FEEDBACK_FROM,
		FEEDBACK_TO,
	);

	if (!result.ok) {
		console.error("Resend error", result.status, result.error);
		return new Response("Failed to send feedback", { status: 502, headers });
	}
	return new Response(null, { status: 204, headers });
}
