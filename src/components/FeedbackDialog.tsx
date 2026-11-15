import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Script } from "../types";
import { sendFeedback } from "../utils/feedback";
import "./FeedbackDialog.css";

interface Props {
	open: boolean;
	onClose: () => void;
	scripts: Script[];
}

type Status = "idle" | "sending" | "sent" | "error";

export function FeedbackDialog({ open, onClose, scripts }: Props) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [message, setMessage] = useState("");
	const [scriptId, setScriptId] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState("");

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const handleClose = () => {
		if (status === "sent") {
			setMessage("");
			setScriptId("");
			setStatus("idle");
		}
		onClose();
	};

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setStatus("sending");
		setError("");
		const script = scripts.find((s) => s.id === scriptId);
		try {
			await sendFeedback({
				message,
				script: script && { filename: script.filename, source: script.source },
			});
			setStatus("sent");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStatus("error");
		}
	};

	return (
		<dialog
			ref={dialogRef}
			className="feedback-dialog"
			id="feedback-dialog"
			aria-labelledby="feedback-title"
			onClose={handleClose}
		>
			<h3 id="feedback-title">Send Feedback</h3>
			{status === "sent" ? (
				<>
					<p id="feedback-success">Thanks! Your feedback was sent.</p>
					<div className="modal-actions">
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleClose}
						>
							Close
						</button>
					</div>
				</>
			) : (
				<form onSubmit={handleSubmit}>
					<textarea
						id="feedback-message"
						aria-label="Feedback message"
						placeholder="Bug report, idea, or anything else..."
						required
						maxLength={5000}
						rows={6}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
					{scripts.length > 0 && (
						<label className="feedback-field">
							<span>Attach script</span>
							<select
								id="feedback-script"
								value={scriptId}
								onChange={(e) => setScriptId(e.target.value)}
							>
								<option value="">None</option>
								{scripts.map((s) => (
									<option key={s.id} value={s.id}>
										{s.meta.name ?? s.filename}
									</option>
								))}
							</select>
						</label>
					)}
					<p className="feedback-note">
						Sent anonymously. Only the extension version and browser info are
						included.
					</p>
					{status === "error" && (
						<p className="feedback-error" id="feedback-error">
							Failed to send: {error}
						</p>
					)}
					<div className="modal-actions">
						<button type="button" className="btn" onClick={handleClose}>
							Cancel
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							id="feedback-submit"
							disabled={status === "sending" || !message.trim()}
						>
							{status === "sending" ? "Sending..." : "Send"}
						</button>
					</div>
				</form>
			)}
		</dialog>
	);
}
