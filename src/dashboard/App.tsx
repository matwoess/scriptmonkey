import { javascript } from "@codemirror/lang-javascript";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import CodeMirror, { type ViewUpdate } from "@uiw/react-codemirror";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtensionMessage, Script, UpdateInfo } from "../types";

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

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getRelativeTime(timestamp?: number): string {
	if (!timestamp) return "never";
	const diff = Date.now() - timestamp;
	const secs = Math.floor(diff / 1000);
	const mins = Math.floor(secs / 60);
	const hours = Math.floor(mins / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);

	if (weeks > 0) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
	if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
	if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	if (mins > 0) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
	return "just now";
}

function getScriptIcon(name: string): { icon: string; bg: string } {
	const lower = name.toLowerCase();
	if (lower.includes("paragraph")) {
		return { icon: "☰", bg: "#73daca" };
	}
	if (lower.includes("add button")) {
		return { icon: "+", bg: "#73daca" };
	}
	if (lower.includes("progress")) {
		return { icon: "📊", bg: "#73daca" };
	}
	if (
		lower.includes("block") ||
		lower.includes("ads") ||
		lower.includes("shield")
	) {
		return { icon: "🛡", bg: "#73daca" };
	}
	return { icon: name.charAt(0).toUpperCase() || "S", bg: "#e0af68" };
}

function getGrants(sourceCode: string): string[] {
	const grants: string[] = [];
	const lines = sourceCode.split("\n");
	for (const line of lines) {
		const match = line.match(/\/\/\s*@grant\s+(.*)/i);
		if (match) {
			grants.push(match[1].trim());
		}
	}
	return grants.length > 0 ? grants : ["none"];
}

export default function App() {
	const [scripts, setScripts] = useState<Script[]>([]);
	const [selectedScript, setSelectedScript] = useState<Script | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [userScriptsAvailable, setUserScriptsAvailable] =
		useState<boolean>(true);
	const [updatesById, setUpdatesById] = useState<Map<string, UpdateInfo>>(
		new Map(),
	);
	const [hasCheckedUpdates, setHasCheckedUpdates] = useState<boolean>(false);
	const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
	const [isUpdatingAll, setIsUpdatingAll] = useState<boolean>(false);

	// Integrated Editor States
	const [code, setCode] = useState<string>("");
	const [baselineCode, setBaselineCode] = useState<string>("");
	const [saveStatus, setSaveStatus] = useState<
		"saved" | "unsaved" | "saving" | "error" | ""
	>("");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [syntaxErrorMessage, setSyntaxErrorMessage] = useState<string>("");
	const [hasSyntaxError, setHasSyntaxError] = useState<boolean>(false);
	const [editorCursor, setEditorCursor] = useState({ line: 1, col: 1 });

	// Tab states
	const [activeTab, setActiveTab] = useState<"editor" | "details" | "history">(
		"editor",
	);

	// Match input state
	const [newMatchPattern, setNewMatchPattern] = useState<string>("");

	// Confirm modal state
	const [confirmModal, setConfirmModal] = useState<{
		show: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Drag & Drop state
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const hasInitializedRef = useRef(false);

	const loadData = useCallback(async () => {
		const status = await send<{ userScriptsAvailable: boolean }>({
			type: "getStatus",
		});
		setUserScriptsAvailable(status.userScriptsAvailable);

		const loadedScripts = await send<Script[]>({ type: "getScripts" });
		setScripts(loadedScripts);
	}, []);

	useEffect(() => {
		loadData().catch(console.error);
	}, [loadData]);

	const handleEdit = useCallback(
		(script: Script) => {
			if (saveStatus === "unsaved") {
				const proceed = window.confirm(
					"You have unsaved changes in the current script. Discard them?",
				);
				if (!proceed) return;
			}
			setSelectedScript(script);
			setBaselineCode(script.source);
			setCode(script.source);
			setSaveStatus("saved");
			setErrorMessage("");
			setSyntaxErrorMessage("");
			setHasSyntaxError(false);
			setActiveTab("editor");

			// Update URL query parameter
			const url = new URL(window.location.href);
			url.searchParams.set("edit", script.id);
			window.history.pushState({}, "", url.toString());
		},
		[saveStatus],
	);

	// Handle initial URL parameters for preloading a script to edit
	useEffect(() => {
		if (scripts.length === 0 || hasInitializedRef.current) return;
		const params = new URLSearchParams(window.location.search);
		const editId = params.get("edit");
		if (editId) {
			const found = scripts.find((s) => s.id === editId);
			if (found) {
				hasInitializedRef.current = true;
				handleEdit(found);
			}
		}
	}, [scripts, handleEdit]);

	const handleCloseEditor = () => {
		if (saveStatus === "unsaved") {
			const proceed = window.confirm("You have unsaved changes. Discard them?");
			if (!proceed) return;
		}
		setSelectedScript(null);
		setSaveStatus("");

		// Clear URL query parameter
		const url = new URL(window.location.href);
		url.searchParams.delete("edit");
		window.history.pushState({}, "", url.toString());
	};

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

			// Update cursor line / col
			const pos = viewUpdate.state.selection.main.head;
			const lineObj = viewUpdate.state.doc.lineAt(pos);
			setEditorCursor({
				line: lineObj.number,
				col: pos - lineObj.from + 1,
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
		if (!selectedScript) return;
		setSaveStatus("saving");
		setErrorMessage("");

		send<Script>({ type: "saveScript", id: selectedScript.id, source: code })
			.then((updatedScript) => {
				setBaselineCode(code);
				setSaveStatus("saved");
				setScripts((prev) =>
					prev.map((s) => (s.id === updatedScript.id ? updatedScript : s)),
				);
				setSelectedScript(updatedScript);
			})
			.catch((err) => {
				console.error("Failed to save:", err);
				setSaveStatus("error");
				setErrorMessage(err instanceof Error ? err.message : String(err));
			});
	};

	const handleSaveWithCode = async (sourceToSave: string) => {
		if (!selectedScript) return;
		setSaveStatus("saving");
		setErrorMessage("");
		try {
			const updatedScript = await send<Script>({
				type: "saveScript",
				id: selectedScript.id,
				source: sourceToSave,
			});
			setBaselineCode(sourceToSave);
			setCode(sourceToSave);
			setSaveStatus("saved");
			setScripts((prev) =>
				prev.map((s) => (s.id === updatedScript.id ? updatedScript : s)),
			);
			setSelectedScript(updatedScript);
		} catch (err) {
			console.error("Failed to save:", err);
			setSaveStatus("error");
			setErrorMessage(err instanceof Error ? err.message : String(err));
		}
	};

	// Save keyboard shortcut Ctrl+S
	const saveRef = useRef(() => {});
	saveRef.current = () => {
		const hasChanges = code !== baselineCode;
		if (hasChanges && !hasSyntaxError && saveStatus !== "saving") {
			handleSave();
		}
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				saveRef.current();
			}
		};
		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, []);

	// Unsaved prompt warning when leaving the dashboard tab
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			const hasChanges = code !== baselineCode;
			if (hasChanges) {
				e.preventDefault();
				e.returnValue = "";
				return "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [code, baselineCode]);

	const handleToggle = async (id: string) => {
		await send({ type: "toggleScript", id });
		await loadData();
		if (selectedScript && selectedScript.id === id) {
			setSelectedScript((prev) =>
				prev ? { ...prev, enabled: !prev.enabled } : null,
			);
		}
	};

	const handleRemove = (script: Script) => {
		setConfirmModal({
			show: true,
			title: "Remove Script",
			message: `Are you sure you want to remove "${script.meta.name ?? script.filename}"?`,
			onConfirm: () => {
				void (async () => {
					await send({ type: "removeScript", id: script.id });
					setConfirmModal(null);
					if (selectedScript?.id === script.id) {
						setSelectedScript(null);
						setSaveStatus("");
						// Clear URL edit param
						const url = new URL(window.location.href);
						url.searchParams.delete("edit");
						window.history.pushState({}, "", url.toString());
					}
					await loadData();
				})();
			},
		});
	};

	const refreshUpdates = async () => {
		setHasCheckedUpdates(true);
		const updates: UpdateInfo[] = await send<UpdateInfo[]>({
			type: "checkForUpdates",
		});
		setUpdatesById(new Map(updates.map((u) => [u.id, u])));
	};

	const handleCheckUpdates = async () => {
		setIsCheckingUpdates(true);
		try {
			await refreshUpdates();
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			setIsCheckingUpdates(false);
		}
	};

	const handleUpdateAll = async () => {
		setIsUpdatingAll(true);
		try {
			await send({ type: "updateAllScripts" });
			await refreshUpdates();
			await loadData();
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			setIsUpdatingAll(false);
		}
	};

	const handleUpdateScript = async (id: string) => {
		try {
			await send({ type: "updateScript", id });
			await refreshUpdates();
			await loadData();
			if (selectedScript && selectedScript.id === id) {
				// Refresh editor code if it was open
				const loadedScripts = await send<Script[]>({ type: "getScripts" });
				const updated = loadedScripts.find((s) => s.id === id);
				if (updated) {
					setSelectedScript(updated);
					setBaselineCode(updated.source);
					setCode(updated.source);
					setSaveStatus("saved");
				}
			}
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
	};

	// Duplicate script logic
	const handleDuplicateScript = async (script: Script) => {
		const newName = `${script.meta.name ?? "Script"} (Copy)`;
		let newSource = script.source;
		const nameRegex = /(\/\/\s*@name\s+)(.*)/i;
		if (nameRegex.test(newSource)) {
			newSource = newSource.replace(nameRegex, `$1${newName}`);
		}
		const count = scripts.filter((s) =>
			s.meta.name?.startsWith(newName),
		).length;
		const suffix = count > 0 ? ` ${count + 1}` : "";
		const finalName = `${newName}${suffix}`;
		newSource = newSource.replace(nameRegex, `$1${finalName}`);

		try {
			const newScripts = [
				{
					filename: script.filename.replace(/\.js$/, "_copy.js"),
					source: newSource,
				},
			];
			await send({ type: "addScripts", scripts: newScripts });
			await loadData();
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
	};

	// Create new template script
	const handleAddNewScript = async () => {
		const count = scripts.filter((s) =>
			s.meta.name?.startsWith("New User Script"),
		).length;
		const suffix = count > 0 ? ` ${count + 1}` : "";
		const scriptName = `New User Script${suffix}`;
		const templateSource = `// ==UserScript==
// @name         ${scriptName}
// @namespace    http://scriptmonkey.local/
// @version      1.0.0
// @description  Describe your script here
// @match        *://*/*
// @grant        none
// ==UserScript==

(function() {
	'use strict';
	console.log('Hello, world!');
})();
`;

		try {
			const newScripts = [
				{
					filename: "new_script.user.js",
					source: templateSource,
				},
			];
			const added = await send<Script[]>({
				type: "addScripts",
				scripts: newScripts,
			});
			await loadData();
			const latest = added.reduce((prev, curr) =>
				prev.createdAt > curr.createdAt ? prev : curr,
			);
			if (latest) {
				handleEdit(latest);
			}
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
	};

	// Match modifications
	const handleAddMatch = () => {
		if (!selectedScript || !newMatchPattern.trim()) return;
		const trimmed = newMatchPattern.trim();
		const lines = code.split("\n");
		const newLines: string[] = [];
		let inserted = false;
		for (const line of lines) {
			if (line.match(/\/\/\s*==\/UserScript==/i) && !inserted) {
				newLines.push(`// @match        ${trimmed}`);
				inserted = true;
			}
			newLines.push(line);
		}
		const newSource = newLines.join("\n");
		handleCodeChange(newSource);
		void handleSaveWithCode(newSource);
		setNewMatchPattern("");
	};

	const handleRemoveMatch = (pattern: string) => {
		if (!selectedScript) return;
		const lines = code.split("\n");
		const newLines: string[] = [];
		let removed = false;
		for (const line of lines) {
			const match = line.match(/\/\/\s*@match\s+(.*)/i);
			if (match && match[1].trim() === pattern && !removed) {
				removed = true;
				continue;
			}
			newLines.push(line);
		}
		const newSource = newLines.join("\n");
		handleCodeChange(newSource);
		void handleSaveWithCode(newSource);
	};

	// Grants modification helper
	const handleManageGrants = () => {
		const newGrant = window.prompt(
			"Enter GM function to grant (e.g. GM_addStyle, GM_xmlhttpRequest):",
		);
		if (!newGrant) return;
		const trimmed = newGrant.trim();
		if (!trimmed) return;
		const lines = code.split("\n");
		const newLines: string[] = [];
		let inserted = false;
		for (const line of lines) {
			if (line.match(/\/\/\s*==\/UserScript==/i) && !inserted) {
				newLines.push(`// @grant        ${trimmed}`);
				inserted = true;
			}
			newLines.push(line);
		}
		const newSource = newLines.join("\n");
		handleCodeChange(newSource);
		void handleSaveWithCode(newSource);
	};

	// Drag & Drop handlers
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.currentTarget === e.target) {
			setIsDragging(false);
		}
	};

	const processFiles = async (files: File[]) => {
		try {
			const newScripts = await Promise.all(
				files.map(async (file) => ({
					filename: file.name,
					source: await file.text(),
				})),
			);
			await send({ type: "addScripts", scripts: newScripts });
			await loadData();
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = Array.from(e.dataTransfer.files ?? []);
		if (!files.length) return;
		void processFiles(files);
	};

	const filteredScripts = scripts.filter((s) => {
		const name = (s.meta.name ?? s.filename).toLowerCase();
		const desc = (s.meta.description ?? "").toLowerCase();
		const query = searchQuery.toLowerCase();
		return name.includes(query) || desc.includes(query);
	});

	const canUpdateAny = scripts.some(
		(s) => s.meta.downloadurl || s.meta.updateurl,
	);
	const availableUpdates = Array.from(updatesById.values()).filter(
		(u) => u.hasUpdate,
	).length;

	const hasChanges = code !== baselineCode;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drag drop container
		<div
			className="dashboard-root"
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{isDragging && (
				<div className="drag-overlay">
					<div className="drag-overlay-message">
						<span className="overlay-emoji">🐒</span>
						<h2>Drop scripts here to install!</h2>
						<p>Accepts .js and .user.js files</p>
					</div>
				</div>
			)}

			<div className="app-container">
				{/* Top Global Header */}
				<header className="global-header">
					<div className="header-brand">
						<span className="brand-icon">🐵</span>
						<h1>Scriptmonkey</h1>
					</div>
					<div className="header-actions">
						<button
							type="button"
							className={
								hasCheckedUpdates && availableUpdates > 0
									? "btn btn-accent btn-header"
									: "btn btn-secondary btn-header"
							}
							onClick={() => {
								if (hasCheckedUpdates && availableUpdates > 0) {
									void handleUpdateAll();
								} else {
									void handleCheckUpdates();
								}
							}}
							disabled={
								isCheckingUpdates ||
								isUpdatingAll ||
								!canUpdateAny ||
								(hasCheckedUpdates && availableUpdates === 0)
							}
						>
							{isCheckingUpdates
								? "Checking..."
								: isUpdatingAll
									? "Updating..."
									: hasCheckedUpdates && availableUpdates > 0
										? `Update (${availableUpdates})`
										: "Check for updates"}
						</button>
						<button
							type="button"
							className="btn btn-secondary btn-header btn-with-icon"
							onClick={() => fileInputRef.current?.click()}
						>
							<span className="btn-icon-symbol">📤</span> Import Script
						</button>
						<button
							type="button"
							className="btn btn-primary btn-header btn-with-icon"
							onClick={handleAddNewScript}
						>
							<span className="btn-icon-symbol">+</span> Add New Script
						</button>
					</div>
				</header>

				<div className="workspace-container">
					{/* Left sidebar: script list */}
					<aside className="sidebar">
						<div className="sidebar-title-row">
							<div className="title-block">
								<h2>All Scripts</h2>
								<span className="scripts-badge" id="count">
									({scripts.length})
								</span>
							</div>
							<span className="subtitle">Manage your userscripts</span>
						</div>

						{!userScriptsAvailable && (
							<div className="sidebar-banner" id="warning">
								"Allow User Scripts" is disabled. Go to{" "}
								<button
									type="button"
									className="link-btn"
									onClick={() => {
										chrome.tabs.create({
											url: `chrome://extensions/?id=${chrome.runtime.id}`,
										});
									}}
								>
									extension settings
								</button>{" "}
								to enable it.
							</div>
						)}

						<div className="search-filter-row">
							<div className="search-box">
								<span className="search-icon">🔍</span>
								<input
									type="text"
									placeholder="Search scripts..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<button type="button" className="btn btn-secondary btn-filter">
								<span className="filter-icon">⚙️</span> Filter
							</button>
						</div>

						<div className="script-list">
							{filteredScripts.length === 0 ? (
								<div className="sidebar-empty">
									{scripts.length === 0 ? (
										<div className="welcome-sidebar-state">
											<p>No scripts installed.</p>
											<p className="hint">Drag & drop files here to install.</p>
										</div>
									) : (
										<p>No matching scripts.</p>
									)}
								</div>
							) : (
								filteredScripts.map((script) => {
									const name = script.meta.name ?? script.filename;
									const isEditing = selectedScript?.id === script.id;
									const updateInfo = updatesById.get(script.id);
									const hasUpdate = updateInfo?.hasUpdate;
									const iconInfo = getScriptIcon(name);

									return (
										// biome-ignore lint/a11y/useSemanticElements: custom script card component
										<div
											key={script.id}
											className={`script-card ${isEditing ? "active" : ""}`}
											onClick={() => handleEdit(script)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													handleEdit(script);
												}
											}}
											tabIndex={0}
											role="button"
										>
											<div className="card-left">
												<div
													className="script-type-icon"
													style={{ backgroundColor: iconInfo.bg }}
												>
													{iconInfo.icon}
												</div>
											</div>
											<div className="card-mid">
												<div className="card-top-row">
													<span className="card-name" title={name}>
														{name}
													</span>
													{script.meta.description && (
														<p
															className="card-desc"
															title={script.meta.description}
														>
															{script.meta.description}
														</p>
													)}
												</div>

												<div className="card-matches">
													{script.meta.matches.slice(0, 2).map((m) => (
														<span
															key={m}
															className="card-match-badge"
															title={m}
														>
															{m}
														</span>
													))}
													{script.meta.matches.length > 2 && (
														<span className="card-match-badge text-muted">
															+{script.meta.matches.length - 2} more
														</span>
													)}
												</div>

												<div className="card-metadata-row text-muted">
													<span className="meta-item">
														v{script.meta.version ?? "1.0.0"}
													</span>
													<span className="meta-badge-count">
														{script.meta.matches.length}
													</span>
													<span className="meta-item">
														📅 {formatDate(script.createdAt)}
													</span>
													<span className="meta-item">
														{getRelativeTime(
															script.updatedAt ?? script.createdAt,
														)}
													</span>
												</div>
											</div>

											<div className="card-right">
												{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
												<div
													className="card-toggle-wrapper"
													onClick={(e) => e.stopPropagation()}
													onKeyDown={(e) => e.stopPropagation()}
												>
													<label className="toggle-switch">
														<input
															type="checkbox"
															checked={script.enabled}
															onChange={() => void handleToggle(script.id)}
														/>
														<span className="toggle-slider"></span>
													</label>
												</div>
												<div className="card-actions-wrapper">
													{hasUpdate && (
														<button
															type="button"
															className="btn-card-action btn-update"
															title="Update Script"
															onClick={(e) => {
																e.stopPropagation();
																void handleUpdateScript(script.id);
															}}
														>
															🔄
														</button>
													)}
													<button
														type="button"
														className="btn-card-action"
														title="Edit"
														onClick={(e) => {
															e.stopPropagation();
															handleEdit(script);
														}}
													>
														✏️
													</button>
													<button
														type="button"
														className="btn-card-action"
														title="Duplicate"
														onClick={(e) => {
															e.stopPropagation();
															void handleDuplicateScript(script);
														}}
													>
														📋
													</button>
													<button
														type="button"
														className="btn-card-action btn-delete"
														title="Delete"
														onClick={(e) => {
															e.stopPropagation();
															handleRemove(script);
														}}
													>
														🗑️
													</button>
												</div>
											</div>
										</div>
									);
								})
							)}

							{/* Add New Script Shortcut Card */}
							{/* biome-ignore lint/a11y/useSemanticElements: custom shortcut card button */}
							<div
								className="script-card add-shortcut-card"
								onClick={handleAddNewScript}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										void handleAddNewScript();
									}
								}}
								tabIndex={0}
								role="button"
							>
								<div className="shortcut-inner">
									<span className="shortcut-plus">+</span>
									<div className="shortcut-text">
										<h3>Add New Script</h3>
										<p className="text-muted">
											Upload a file or create a new script
										</p>
									</div>
								</div>
							</div>
						</div>
					</aside>

					{/* Right pane: integrated editor or dashboard welcome */}
					<main className="main-content">
						{selectedScript ? (
							<div className="editor-view">
								{/* Editor title panel */}
								<header className="editor-view-header">
									<div className="header-left">
										<div
											className="editor-type-icon"
											style={{
												backgroundColor: getScriptIcon(
													selectedScript.meta.name ?? selectedScript.filename,
												).bg,
											}}
										>
											{
												getScriptIcon(
													selectedScript.meta.name ?? selectedScript.filename,
												).icon
											}
										</div>
										<div className="editor-title-block">
											<h2>
												{selectedScript.meta.name ?? selectedScript.filename}
											</h2>
											<span
												className={`status-dot ${selectedScript.enabled ? "enabled" : "disabled"}`}
											/>
											<span className="status-dot-label text-muted">
												{selectedScript.enabled ? "Enabled" : "Disabled"}
											</span>
										</div>
									</div>
									<button
										type="button"
										className="btn-close-view"
										onClick={handleCloseEditor}
										title="Close Editor"
									>
										&times;
									</button>
								</header>

								{/* Tabs subheader row */}
								<div className="editor-subheader">
									<div className="editor-tabs">
										<button
											type="button"
											className={`tab-btn ${activeTab === "editor" ? "active" : ""}`}
											onClick={() => setActiveTab("editor")}
										>
											Editor
										</button>
										<button
											type="button"
											className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
											onClick={() => setActiveTab("details")}
										>
											Details
										</button>
										<button
											type="button"
											className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
											onClick={() => setActiveTab("history")}
										>
											History
										</button>
									</div>

									<div className="editor-header-actions">
										{saveStatus === "unsaved" && (
											<span className="status-badge tag-unsaved">
												Unsaved changes
											</span>
										)}
										{saveStatus === "saving" && (
											<span className="status-badge tag-saving">Saving...</span>
										)}
										{saveStatus === "saved" && (
											<span className="status-badge tag-saved">Saved</span>
										)}
										{saveStatus === "error" && (
											<span
												className="status-badge tag-error"
												title={errorMessage || syntaxErrorMessage}
											>
												Error
											</span>
										)}

										<button type="button" className="btn btn-secondary">
											Actions <span className="dropdown-arrow">▼</span>
										</button>
										<button
											type="button"
											className="btn btn-primary"
											id="btn-save-script"
											onClick={handleSave}
											disabled={
												!hasChanges || hasSyntaxError || saveStatus === "saving"
											}
										>
											Save Changes
										</button>
									</div>
								</div>

								{/* Tab view rendering */}
								{activeTab === "editor" && (
									<div className="editor-workspace-tab">
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

										<div className="editor-wrapper-box">
											<CodeMirror
												value={code}
												height="100%"
												theme="dark"
												extensions={[javascript()]}
												onChange={handleCodeChange}
												className="codemirror-editor"
											/>
											{/* Editor status line */}
											<div className="editor-footer-status">
												<div className="status-left">
													<span>
														Ln {editorCursor.line}, Col {editorCursor.col}
													</span>
													<span>Spaces: 2</span>
													<span>UTF-8</span>
													<span>JavaScript</span>
												</div>
												<div className="status-right">
													<span className="auto-save-tag">✔️ Auto-save on</span>
												</div>
											</div>
										</div>

										{/* Detailed Cards Under Code Editor */}
										<div className="editor-details-grid">
											{/* Matches Card */}
											<div className="detail-card">
												<h3>Matches ({selectedScript.meta.matches.length})</h3>
												<div className="matches-list-box">
													{selectedScript.meta.matches.map((m) => (
														<div key={m} className="match-item-row">
															<span className="match-url">{m}</span>
															<div className="match-item-actions">
																<span className="match-valid-icon">✔️</span>
																<button
																	type="button"
																	className="btn-remove-match"
																	onClick={() => handleRemoveMatch(m)}
																	title="Remove match pattern"
																>
																	&times;
																</button>
															</div>
														</div>
													))}
												</div>
												<div className="add-match-box">
													<input
														type="text"
														placeholder="Add match pattern (e.g. *://*.google.com/*)"
														value={newMatchPattern}
														onChange={(e) => setNewMatchPattern(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === "Enter") handleAddMatch();
														}}
													/>
													<button
														type="button"
														className="btn btn-secondary btn-small"
														onClick={handleAddMatch}
													>
														+ Add Match
													</button>
												</div>
											</div>

											{/* Grants Card */}
											<div className="detail-card">
												<h3>Grants ({getGrants(code).length})</h3>
												<div className="grants-list-box">
													{getGrants(code).map((g) => (
														<span key={g} className="grant-badge">
															{g}
														</span>
													))}
												</div>
												<button
													type="button"
													className="btn btn-secondary btn-manage-grants"
													onClick={handleManageGrants}
												>
													Manage
												</button>
											</div>

											{/* Metadata Card */}
											<div className="detail-card">
												<h3>Metadata</h3>
												<table className="metadata-table">
													<tbody>
														<tr>
															<td className="meta-label">Version</td>
															<td className="meta-val">
																{selectedScript.meta.version ?? "1.0.0"}
															</td>
														</tr>
														<tr>
															<td className="meta-label">Created</td>
															<td className="meta-val">
																{formatDate(selectedScript.createdAt)}
															</td>
														</tr>
														<tr>
															<td className="meta-label">Last Updated</td>
															<td className="meta-val">
																{formatDate(
																	selectedScript.updatedAt ??
																		selectedScript.createdAt,
																)}{" "}
																<span className="text-muted">
																	(
																	{getRelativeTime(
																		selectedScript.updatedAt ??
																			selectedScript.createdAt,
																	)}
																	)
																</span>
															</td>
														</tr>
														<tr>
															<td className="meta-label">Size</td>
															<td className="meta-val">
																{(code.length / 1024).toFixed(1)} KB
															</td>
														</tr>
														<tr>
															<td className="meta-label">Status</td>
															<td className="meta-val">
																<span
																	className={`status-dot ${selectedScript.enabled ? "enabled" : "disabled"}`}
																/>
																<span>
																	{selectedScript.enabled
																		? "Enabled"
																		: "Disabled"}
																</span>
															</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}

								{activeTab === "details" && (
									<div className="editor-workspace-tab tab-details-view">
										<div className="detail-card full-width">
											<h3>Script Settings</h3>
											<table className="settings-table">
												<tbody>
													<tr>
														<td>Name</td>
														<td>
															{selectedScript.meta.name ??
																selectedScript.filename}
														</td>
													</tr>
													<tr>
														<td>Namespace</td>
														<td>{selectedScript.meta.namespace ?? "N/A"}</td>
													</tr>
													<tr>
														<td>Description</td>
														<td>{selectedScript.meta.description ?? "N/A"}</td>
													</tr>
													<tr>
														<td>Run At</td>
														<td>{selectedScript.meta["run-at"] ?? "N/A"}</td>
													</tr>
													<tr>
														<td>Includes</td>
														<td>
															{Array.isArray(selectedScript.meta.include)
																? selectedScript.meta.include.join(", ")
																: (selectedScript.meta.include ?? "N/A")}{" "}
															<span
																className="unsupported-tag"
																style={{
																	color: "orange",
																	fontSize: "11.5px",
																	marginLeft: "8px",
																}}
															>
																(unsupported)
															</span>
														</td>
													</tr>
													<tr>
														<td>Excludes</td>
														<td>
															{Array.isArray(selectedScript.meta.exclude)
																? selectedScript.meta.exclude.join(", ")
																: (selectedScript.meta.exclude ?? "N/A")}{" "}
															<span
																className="unsupported-tag"
																style={{
																	color: "orange",
																	fontSize: "11.5px",
																	marginLeft: "8px",
																}}
															>
																(unsupported)
															</span>
														</td>
													</tr>
													<tr>
														<td>Filename</td>
														<td>{selectedScript.filename}</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>
								)}

								{activeTab === "history" && (
									<div className="editor-workspace-tab tab-history-view">
										<div className="detail-card full-width">
											<h3>Version History</h3>
											<div className="history-timeline">
												<div className="timeline-item">
													<div className="timeline-marker" />
													<div className="timeline-content">
														<h4>
															v{selectedScript.meta.version ?? "1.0.0"}{" "}
															(Current)
														</h4>
														<p className="text-muted">
															Last updated on{" "}
															{new Date(
																selectedScript.updatedAt ??
																	selectedScript.createdAt,
															).toLocaleString()}
														</p>
													</div>
												</div>
												<div className="timeline-item">
													<div className="timeline-marker marker-green" />
													<div className="timeline-content">
														<h4>Script Created</h4>
														<p className="text-muted">
															Added on{" "}
															{new Date(
																selectedScript.createdAt,
															).toLocaleString()}
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="welcome-view">
								<div className="welcome-hero">
									<div className="welcome-monkey">🐒</div>
									<h1>Scriptmonkey Dashboard</h1>
									<p className="welcome-tagline">
										Manage and write user scripts for your browser.
									</p>
								</div>

								<div className="dashboard-grid">
									{/* biome-ignore lint/a11y/noStaticElementInteractions: click to open file picker */}
									{/* biome-ignore lint/a11y/useKeyWithClickEvents: click to open file picker */}
									<div
										className="grid-card drag-drop-zone"
										style={{ cursor: "pointer" }}
										onClick={() => fileInputRef.current?.click()}
									>
										<div className="dropzone-inner">
											<div className="dropzone-icon">📥</div>
											<h3>Drag & Drop Scripts</h3>
											<p>
												Click or drag `.user.js` or `.js` script files here to
												import them.
											</p>
										</div>
									</div>

									<div className="grid-card stats-card">
										<h3>Overview</h3>
										<div className="stat-row">
											<span className="stat-label">Total Scripts</span>
											<span className="stat-val">{scripts.length}</span>
										</div>
										<div className="stat-row">
											<span className="stat-label">Enabled Scripts</span>
											<span className="stat-val">
												{scripts.filter((s) => s.enabled).length}
											</span>
										</div>
										<div className="stat-row">
											<span className="stat-label">Allow User Scripts</span>
											<span
												className={`stat-val ${userScriptsAvailable ? "enabled" : "disabled"}`}
											>
												{userScriptsAvailable ? "Yes" : "No"}
											</span>
										</div>
									</div>

									<div className="grid-card tips-card">
										<h3>Quick Tips</h3>
										<ul>
											<li>
												<strong>Save changes</strong> by clicking Save or
												pressing <kbd>Ctrl + S</kbd>.
											</li>
											<li>
												Drag files directly into the{" "}
												<strong>popup window</strong> or this{" "}
												<strong>dashboard</strong> to instantly install them.
											</li>
											<li>
												Click the toggle switch on a script to quickly enable or
												disable it on its matching URLs.
											</li>
										</ul>
									</div>
								</div>
							</div>
						)}
					</main>
				</div>
			</div>

			{/* Confirmation Modal */}
			{confirmModal?.show && (
				<div className="modal-backdrop">
					<div className="dashboard-modal">
						<h3 id="confirm-title">{confirmModal.title}</h3>
						<p id="confirm-message">{confirmModal.message}</p>
						<div className="modal-footer-actions">
							<button
								type="button"
								className="btn btn-secondary"
								id="confirm-cancel"
								onClick={() => setConfirmModal(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-danger"
								id="confirm-ok"
								onClick={confirmModal.onConfirm}
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}

			<input
				type="file"
				id="file-input"
				accept=".js,.user.js"
				multiple
				hidden
				ref={fileInputRef}
				onChange={(e) => {
					const files = Array.from(e.target.files ?? []);
					if (!files.length) return;
					void processFiles(files);
					if (e.target) e.target.value = "";
				}}
			/>
		</div>
	);
}
