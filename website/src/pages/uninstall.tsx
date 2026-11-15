import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import { type ReactNode, type SubmitEvent, useEffect, useState } from "react";
import styles from "./uninstall.module.css";

const FEEDBACK_ENDPOINT =
	"https://scriptmonkey-feedback.vercel.app/api/feedback";

const REASONS = [
	{
		id: "not-sure-what-it-is",
		label: "I wasn't sure what user scripts are or where to find them",
		hint: (
			<>
				User scripts are small pieces of JavaScript that customize websites you
				visit. You can browse thousands of community scripts on sites like{" "}
				<a
					href="https://greasyfork.org"
					target="_blank"
					rel="noopener noreferrer"
				>
					Greasy Fork
				</a>{" "}
				or{" "}
				<a
					href="https://openuserjs.org"
					target="_blank"
					rel="noopener noreferrer"
				>
					OpenUserJS
				</a>
				, or check out our <Link to="/docs/overview">Overview guide</Link>.
			</>
		),
	},
	{
		id: "missing-translation",
		label: "The extension is not available in my language",
	},
	{
		id: "enable-permission",
		label: 'I had trouble enabling the "Allow User Scripts" permission',
		hint: (
			<>
				Chrome's Manifest V3 requires enabling the{" "}
				<strong>Allow User Scripts</strong> toggle in{" "}
				<code>chrome://extensions</code> details before scripts can run.
			</>
		),
	},
	{
		id: "script-did-not-work",
		label: "A script I wanted to use didn't work (e.g. missing GM_* APIs)",
	},
	{
		id: "missing-features",
		label:
			"Missing features I needed (e.g. one-click install from Greasy Fork, sync)",
	},
	{
		id: "bugs",
		label: "I ran into bugs or unexpected behavior",
	},
	{
		id: "switching",
		label:
			"Switching to another user script manager (Tampermonkey, Violentmonkey, etc.)",
	},
	{
		id: "just-trying",
		label: "Just testing it out / no longer need it",
	},
	{
		id: "other",
		label: "Something else",
	},
] as const;

export default function UninstallPage(): ReactNode {
	const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
	const [details, setDetails] = useState("");
	const [version, setVersion] = useState("unknown");
	const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const v = params.get("v");
		if (v) {
			setVersion(v);
		}
	}, []);

	const toggleReason = (id: string) => {
		setSelectedReasons((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	};

	const canSubmit = selectedReasons.length > 0 || details.trim().length > 0;

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!canSubmit) return;

		setStatus("sending");
		setErrorMessage("");

		const chosenLabels = REASONS.filter((r) =>
			selectedReasons.includes(r.id),
		).map((r) => `- ${r.label}`);

		const parts = ["[Uninstall Feedback]"];
		if (chosenLabels.length > 0) {
			parts.push(`Reasons:\n${chosenLabels.join("\n")}`);
		}
		if (details.trim()) {
			parts.push(`Details:\n${details.trim()}`);
		}

		try {
			const res = await fetch(FEEDBACK_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: parts.join("\n\n"),
					version,
					userAgent: navigator.userAgent,
				}),
			});

			if (!res.ok) {
				throw new Error((await res.text()) || `HTTP ${res.status}`);
			}
			setStatus("sent");
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : String(err));
			setStatus("error");
		}
	};

	return (
		<Layout
			title="Sorry to see you go — Scriptmonkey"
			description="Thank you for trying Scriptmonkey. Let us know how we can improve."
		>
			<main className={styles.page}>
				<div className={styles.card}>
					<div className={styles.header}>
						<img
							src={useBaseUrl("/img/logo.svg")}
							width="48"
							height="48"
							alt="Scriptmonkey Logo"
							className={styles.logo}
						/>
						<Heading as="h1" className={styles.title}>
							Sorry to see you go!
						</Heading>
						<p className={styles.subtitle}>
							Thanks for giving Scriptmonkey a try. It's a small solo
							open-source project, and honest feedback is the best way for me to
							make it better. If you have 15 seconds, what made you uninstall?
						</p>
					</div>

					{status === "sent" ? (
						<div className={styles.successBox} id="uninstall-success">
							<Heading as="h2" className={styles.successTitle}>
								Thank you for your feedback!
							</Heading>
							<p className={styles.successText}>
								I really appreciate you taking the time to share your thoughts.
								Every feedback helps shape future updates.
							</p>
							<div className={styles.successActions}>
								<a
									className="btn btn-secondary"
									href="https://chromewebstore.google.com/detail/scriptmonkey-beta/afmgkdanppbobipehgpfcmhpgeoejcpn"
									target="_blank"
									rel="noopener noreferrer"
								>
									Reinstall from Chrome Web Store
								</a>
								<Link className="btn btn-primary" to="/">
									Back to Home
								</Link>
							</div>
						</div>
					) : (
						<form onSubmit={handleSubmit} className={styles.form}>
							<fieldset className={styles.fieldset}>
								<legend className={styles.legend}>
									Why did you uninstall? (Select any that apply)
								</legend>
								<div className={styles.reasonsList}>
									{REASONS.map((reason) => {
										const checked = selectedReasons.includes(reason.id);
										return (
											<div key={reason.id} className={styles.reasonItem}>
												<label
													className={`${styles.reasonLabel} ${checked ? styles.reasonLabelChecked : ""}`}
												>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => toggleReason(reason.id)}
														className={styles.checkbox}
													/>
													<span>{reason.label}</span>
												</label>
												{checked && "hint" in reason && reason.hint && (
													<div className={styles.hintBox}>{reason.hint}</div>
												)}
											</div>
										);
									})}
								</div>
							</fieldset>

							<div className={styles.textareaGroup}>
								<label htmlFor="uninstall-details" className={styles.label}>
									Anything else you'd like to share? (Optional)
								</label>
								<textarea
									id="uninstall-details"
									className={styles.textarea}
									rows={4}
									maxLength={4000}
									placeholder="Which script didn't work, what feature was missing, or what felt confusing?"
									value={details}
									onChange={(e) => setDetails(e.target.value)}
								/>
							</div>

							{status === "error" && (
								<p className={styles.errorText}>
									Could not send feedback ({errorMessage}). You can also{" "}
									<a
										href="https://github.com/matwoess/Scriptmonkey/issues"
										target="_blank"
										rel="noopener noreferrer"
									>
										open an issue on GitHub
									</a>
									.
								</p>
							)}

							<div className={styles.footer}>
								<span className={styles.privacyNote}>
									Sent anonymously. No personal data is collected.
								</span>
								<button
									type="submit"
									className={`btn btn-primary btn-glow ${styles.submitBtn}`}
									disabled={!canSubmit || status === "sending"}
								>
									{status === "sending" ? "Sending..." : "Send Feedback"}
								</button>
							</div>
						</form>
					)}
				</div>
			</main>
		</Layout>
	);
}
