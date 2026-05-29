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
		"error" in response &&
		typeof response.error === "string"
	) {
		throw new Error(response.error);
	}
	return response as T;
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
		// Only set dragging to false if we leave the outer drop container
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

			{/* Left sidebar: script list */}
			<aside className="sidebar">
				<header className="sidebar-header">
					<div className="sidebar-logo">
						<span className="logo-emoji">🐵</span>
						<div>
							<h1>Scriptmonkey</h1>
							<span className="logo-sub">Dashboard</span>
						</div>
					</div>
					<div className="sidebar-actions">
						{scripts.length > 0 && (
							<button
								type="button"
								className={
									hasCheckedUpdates && availableUpdates > 0
										? "btn btn-accent btn-small"
										: "btn btn-secondary btn-small"
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
									: hasCheckedUpdates && availableUpdates > 0
										? `Update (${availableUpdates})`
										: "Check updates"}
							</button>
						)}
					</div>
				</header>

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

				<div className="search-box">
					<input
						type="text"
						placeholder="Search scripts..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="script-list">
					<div className="list-count" id="count">
						{scripts.length} script{scripts.length === 1 ? "" : "s"}
					</div>

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
									<div className="card-top">
										<div className="card-title-block">
											<span className="card-name" title={name}>
												{name}
											</span>
											<span className="card-version text-muted">
												{script.meta.version ? `v${script.meta.version}` : ""}
											</span>
										</div>
										{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper */}
										<div
											className="card-toggle"
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
									</div>

									{script.meta.description && (
										<p className="card-desc" title={script.meta.description}>
											{script.meta.description}
										</p>
									)}

									<div className="card-matches">
										{script.meta.matches.slice(0, 2).map((m) => (
											<span key={m} className="card-match-badge" title={m}>
												{m}
											</span>
										))}
										{script.meta.matches.length > 2 && (
											<span className="card-match-badge text-muted">
												+{script.meta.matches.length - 2} more
											</span>
										)}
									</div>

									<div className="card-footer">
										<span className="card-size text-muted">
											{(script.source.length / 1024).toFixed(1)} KB
										</span>
										<div className="card-actions">
											{hasUpdate && (
												<button
													type="button"
													className="btn btn-accent btn-mini"
													onClick={(e) => {
														e.stopPropagation();
														void handleUpdateScript(script.id);
													}}
												>
													Update
												</button>
											)}
											<button
												type="button"
												className="btn-icon btn-delete"
												title="Delete Script"
												onClick={(e) => {
													e.stopPropagation();
													handleRemove(script);
												}}
											>
												&times;
											</button>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			</aside>

			{/* Right pane: integrated editor or dashboard welcome */}
			<main className="main-content">
				{selectedScript ? (
					<div className="editor-view">
						<header className="editor-view-header">
							<div className="editor-title-block">
								<h2>{selectedScript.meta.name ?? selectedScript.filename}</h2>
								<span className="editor-subtitle">
									{selectedScript.filename}
								</span>
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

								<button
									type="button"
									className="btn btn-primary"
									id="btn-save-script"
									onClick={handleSave}
									disabled={
										!hasChanges || hasSyntaxError || saveStatus === "saving"
									}
								>
									Save
								</button>
								<button
									type="button"
									className="btn btn-secondary"
									onClick={handleCloseEditor}
								>
									Close
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

						<div className="editor-wrapper">
							<CodeMirror
								value={code}
								height="100%"
								theme="dark"
								extensions={[javascript()]}
								onChange={handleCodeChange}
								className="codemirror-editor"
							/>
						</div>
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
										<strong>Save changes</strong> by clicking Save or pressing{" "}
										<kbd>Ctrl + S</kbd>.
									</li>
									<li>
										Drag files directly into the <strong>popup window</strong>{" "}
										or this <strong>dashboard</strong> to instantly install
										them.
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
