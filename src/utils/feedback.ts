import type { FeedbackPayload } from "../types";

export const FEEDBACK_ENDPOINT =
	"https://scriptmonkey-feedback.vercel.app/api/feedback";

/** Posts feedback to the endpoint, throwing with the server message on failure. */
export async function sendFeedback(
	payload: Omit<FeedbackPayload, "version" | "userAgent">,
): Promise<void> {
	const res = await fetch(FEEDBACK_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			...payload,
			version: chrome.runtime.getManifest().version,
			userAgent: navigator.userAgent,
		} satisfies FeedbackPayload),
	});
	if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
}
