import { javascript } from "@codemirror/lang-javascript";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import CodeMirror, { type ViewUpdate } from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import type { ExtensionMessage, Script } from "../types";

async function send<T = unknown>(message: ExtensionMessage): Promise<T> {
	const response = (await chrome.runtime.sendMessage(message)) as
		| { error?: string }
		| T;
	if (
		response &&
		typeof response === "object" &&
		"error" in response &&
		typeof response.error === "string"
	) {
		throw new Error(response.error);
	}
	return response as T;
}

export default function App() {
	const [script, setScript] = useState<Script | null>(null);
	const [baselineCode, setBaselineCode] = useState<string>("");
	const [code, setCode] = useState<string>("");
	const [saveStatus, setSaveStatus] = useState<
		"saved" | "unsaved" | "saving" | "error" | ""
	>("");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [syntaxErrorMessage, setSyntaxErrorMessage] = useState<string>("");
	const [hasSyntaxError, setHasSyntaxError] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

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
					setBaselineCode(found.source);
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

	const handleCodeChange = (newCode: string, viewUpdate?: ViewUpdate) => {
		setCode(newCode);

		let hasError = false;

		if (viewUpdate) {
			const tree =
				ensureSyntaxTree(viewUpdate.state, newCode.length, 500) ||
				syntaxTree(viewUpdate.state);
			tree.iterate({
				enter(node) {
					if (node.type.name === "⚠" || node.type.name === "Error") {
						hasError = true;
						return false;
					}
				},
			});
		}

		const syntaxMsg = hasError ? "Invalid JavaScript syntax detected." : "";

		setHasSyntaxError(hasError);
		setSyntaxErrorMessage(syntaxMsg);

		if (newCode !== baselineCode) {
			setSaveStatus(hasError ? "error" : "unsaved");
			if (!hasError) setErrorMessage("");
		} else {
			setSaveStatus("saved");
			setErrorMessage("");
		}
	};

	const handleSave = () => {
		if (!id) return;
		setSaveStatus("saving");
		setErrorMessage("");

		send<Script>({ type: "saveScript", id, source: code })
			.then((updatedScript) => {
				setScript(updatedScript);
				setBaselineCode(code);
				setSaveStatus("saved");
			})
			.catch((err) => {
				console.error("Failed to save:", err);
				setSaveStatus("error");
				setErrorMessage(err instanceof Error ? err.message : String(err));
			});
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
	const hasChanges = code !== baselineCode;

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
				<div className="header-actions">
					{saveStatus === "unsaved" && (
						<span className="status-tag status-unsaved">Unsaved changes</span>
					)}
					{saveStatus === "saving" && (
						<span className="status-tag status-saving">Saving...</span>
					)}
					{saveStatus === "saved" && (
						<span className="status-tag status-saved">Saved</span>
					)}
					{saveStatus === "error" && (
						<span
							className="status-tag status-error"
							title={errorMessage || syntaxErrorMessage}
						>
							Error
						</span>
					)}
					<button
						type="button"
						className="btn btn-primary btn-save"
						id="btn-save-script"
						onClick={handleSave}
						disabled={!hasChanges || hasSyntaxError || saveStatus === "saving"}
					>
						Save
					</button>
				</div>
			</header>

			{hasSyntaxError && syntaxErrorMessage && (
				<div className="banner-error" id="syntax-error-banner">
					<strong>Syntax Error:</strong> {syntaxErrorMessage}
				</div>
			)}

			{saveStatus === "error" && errorMessage && (
				<div className="banner-error">
					<strong>Save Error:</strong> {errorMessage}
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
