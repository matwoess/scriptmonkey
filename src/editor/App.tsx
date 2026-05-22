import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useRef, useState } from "react";
import type { ExtensionMessage, Script } from "../types";

async function send<T = unknown>(message: ExtensionMessage): Promise<T> {
	const response = (await chrome.runtime.sendMessage(message)) as
		| { error?: string }
		| T;
	if (
		response &&
		typeof response === "object" &&
		"error" in response &&
		"error" in response &&
		typeof response.error === "string"
	) {
		throw new Error(response.error);
	}
	return response as T;
}

export default function App() {
	const [script, setScript] = useState<Script | null>(null);
	const [code, setCode] = useState<string>("");
	const [saveStatus, setSaveStatus] = useState<
		"saved" | "saving" | "error" | ""
	>("");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const params = new URLSearchParams(window.location.search);
	const id = params.get("id");

	useEffect(() => {
		if (!id) {
			setErrorMessage("No script ID provided in URL.");
			setIsLoading(false);
			return;
		}

		send<Script[]>({ type: "getScripts" })
			.then((loadedScripts) => {
				const found = loadedScripts.find((s) => s.id === id);
				if (found) {
					setScript(found);
					setCode(found.source);
					setSaveStatus("saved");
				} else {
					setErrorMessage("Script not found.");
				}
			})
			.catch((err) => {
				setErrorMessage(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [id]);

	const handleCodeChange = (newCode: string) => {
		setCode(newCode);
		setSaveStatus("saving");
		setErrorMessage("");

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			if (!id) return;
			send<Script>({ type: "saveScript", id, source: newCode })
				.then((updatedScript) => {
					setScript(updatedScript);
					setSaveStatus("saved");
				})
				.catch((err) => {
					console.error("Failed to save:", err);
					setSaveStatus("error");
					setErrorMessage(err instanceof Error ? err.message : String(err));
				});
		}, 500);
	};

	if (isLoading) {
		return (
			<div className="status-container">
				<div className="spinner"></div>
				<p>Loading script...</p>
			</div>
		);
	}

	if (errorMessage && !script) {
		return (
			<div className="status-container error">
				<h3>Error Loading Script</h3>
				<p>{errorMessage}</p>
			</div>
		);
	}

	const displayName =
		script?.meta.name ?? script?.filename ?? "Untitled Script";

	return (
		<div className="editor-container">
			<header className="editor-header">
				<div className="header-info">
					<span className="logo-emoji">🐵</span>
					<div className="title-details">
						<h1>{displayName}</h1>
						<span className="subtitle">
							{script?.filename}{" "}
							{script?.meta.version ? `v${script.meta.version}` : ""}
						</span>
					</div>
				</div>
				<div className="header-status">
					{saveStatus === "saving" && (
						<span className="status-tag status-saving">Saving...</span>
					)}
					{saveStatus === "saved" && (
						<span className="status-tag status-saved">Saved</span>
					)}
					{saveStatus === "error" && (
						<span className="status-tag status-error" title={errorMessage}>
							Save Error
						</span>
					)}
				</div>
			</header>

			{saveStatus === "error" && errorMessage && (
				<div className="banner-error">
					<strong>Validation Error:</strong> {errorMessage}
				</div>
			)}

			<main className="editor-main">
				<CodeMirror
					value={code}
					height="100%"
					theme="dark"
					extensions={[javascript()]}
					onChange={handleCodeChange}
					className="codemirror-wrapper"
				/>
			</main>
		</div>
	);
}
