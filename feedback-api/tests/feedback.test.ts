// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildEmail,
	isAllowedOrigin,
	OPTIONS,
	POST,
	parseFeedback,
} from "../api/feedback";

const valid = { message: " Hello\nworld ", version: "1.0.0", userAgent: "UA" };
const EXT = "chrome-extension://abc";

function request(body: unknown, origin = EXT) {
	return new Request("https://x/api/feedback", {
		method: "POST",
		headers: { Origin: origin, "Content-Type": "application/json" },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

describe("parseFeedback", () => {
	it("accepts and trims a minimal payload", () => {
		expect(parseFeedback(valid)).toEqual({ ...valid, message: "Hello\nworld" });
	});

	it.each([
		[null, "Invalid body"],
		[{ ...valid, message: "  " }, "Message is required"],
		[{ ...valid, message: "x".repeat(5001) }, "Message too long"],
		[{ ...valid, version: 1 }, "Invalid version"],
		[{ ...valid, script: { filename: "a.js" } }, "Invalid script"],
	])("rejects %j", (body, error) => {
		expect(parseFeedback(body)).toBe(error);
	});
});

describe("isAllowedOrigin", () => {
	it("matches exact entries and prefix wildcards", () => {
		const allowed = ["https://site.io", "chrome-extension://*"];
		expect(isAllowedOrigin("https://site.io", allowed)).toBe(true);
		expect(isAllowedOrigin(EXT, allowed)).toBe(true);
		expect(isAllowedOrigin("https://evil.io", allowed)).toBe(false);
		expect(isAllowedOrigin(null, allowed)).toBe(false);
	});
});

describe("buildEmail", () => {
	it("attaches the script as base64", () => {
		const email = buildEmail(
			{
				...valid,
				message: "Bug\ndetails",
				script: { filename: "a.user.js", source: "hi" },
			},
			"from@x",
			"to@x",
		);
		expect(email.subject).toBe("[Scriptmonkey v1.0.0] Bug");
		expect(email.attachments).toEqual([
			{ filename: "a.user.js", content: "aGk=" },
		]);
	});
});

describe("handlers", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	function configure() {
		vi.stubEnv("ALLOWED_ORIGINS", EXT);
		vi.stubEnv("RESEND_API_KEY", "key");
		vi.stubEnv("FEEDBACK_FROM", "from@x");
		vi.stubEnv("FEEDBACK_TO", "to@x");
		const fetchMock = vi.fn(async () => new Response("{}"));
		vi.stubGlobal("fetch", fetchMock);
		return fetchMock;
	}

	it("sends the email via Resend", async () => {
		const fetchMock = configure();
		const res = await POST(request(valid));
		expect(res.status).toBe(204);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe(EXT);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.resend.com/emails",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("rejects foreign origins and bad bodies without sending", async () => {
		const fetchMock = configure();
		expect((await POST(request(valid, "https://evil.io"))).status).toBe(403);
		expect((await POST(request("{nope"))).status).toBe(400);
		expect((await POST(request({}))).status).toBe(400);
		expect(OPTIONS(request(valid, "https://evil.io")).status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reports Resend failures as 502", async () => {
		configure().mockResolvedValueOnce(new Response("err", { status: 500 }));
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect((await POST(request(valid))).status).toBe(502);
	});
});
