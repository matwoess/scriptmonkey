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

const MIN_EDITOR_WIDTH = 480;
const MIN_SIDEBAR_WIDTH = 240;

function getConstrainedSidebarWidth(
	width: number,
	windowWidth: number,
): number {
	if (windowWidth < MIN_EDITOR_WIDTH + MIN_SIDEBAR_WIDTH) {
		return Math.max(MIN_SIDEBAR_WIDTH, Math.min(width, windowWidth - 300));
	}
	return Math.max(
		MIN_SIDEBAR_WIDTH,
		Math.min(width, windowWidth - MIN_EDITOR_WIDTH),
	);
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

	// Collapsible metadata state, default to open but persist collapses
	const [isMetadataCollapsed, setIsMetadataCollapsed] = useState<boolean>(
		() => localStorage.getItem("metadata_collapsed") === "true",
	);

	// Draggable sidebar state
	const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
		const saved = localStorage.getItem("sidebar_width");
		const initial = saved ? Number.parseInt(saved, 10) : 440;
		return getConstrainedSidebarWidth(initial, window.innerWidth);
	});
	const [isResizing, setIsResizing] = useState<boolean>(false);

	const startResizing = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
	}, []);

	const stopResizing = useCallback(() => {
		setIsResizing(false);
	}, []);

	const resize = useCallback(
		(e: MouseEvent) => {
			if (isResizing) {
				const newWidth = getConstrainedSidebarWidth(
					e.clientX,
					window.innerWidth,
				);
				setSidebarWidth(newWidth);
				localStorage.setItem("sidebar_width", String(newWidth));
			}
		},
		[isResizing],
	);

	useEffect(() => {
		if (isResizing) {
			window.addEventListener("mousemove", resize);
			window.addEventListener("mouseup", stopResizing);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		} else {
			window.removeEventListener("mousemove", resize);
			window.removeEventListener("mouseup", stopResizing);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		}
		return () => {
			window.removeEventListener("mousemove", resize);
			window.removeEventListener("mouseup", stopResizing);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
	}, [isResizing, resize, stopResizing]);

	useEffect(() => {
		const handleResize = () => {
			setSidebarWidth((prev) =>
				getConstrainedSidebarWidth(prev, window.innerWidth),
			);
		};
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

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

		const syntaxMsg = hasError ? "Unterminated template literal" : "";
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
						<img
							src={chrome.runtime.getURL("images/icon.svg")}
							className="drag-overlay-logo"
							alt="logo"
						/>
						<h2>Drop scripts here to install!</h2>
						<p>Accepts .js and .user.js files</p>
					</div>
				</div>
			)}

			<div className="app-container">
				<div className="workspace-container">
					{/* Left sidebar: brand, import zone, search, and list */}
					<aside className="sidebar" style={{ width: sidebarWidth }}>
						<div className="sidebar-brand">
							<img
								src={chrome.runtime.getURL("images/icon.svg")}
								className="brand-logo-img"
								alt="logo"
							/>
							<h1>Scriptmonkey</h1>
						</div>

						{/* Add / Import Script Zone */}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: click to open file picker */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: click handler */}
						<div
							className="sidebar-import-zone"
							onClick={() => fileInputRef.current?.click()}
						>
							<div className="import-zone-inner">
								<span className="import-icon">
									<svg
										aria-hidden="true"
										viewBox="0 0 24 24"
										width="24"
										height="24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="svg-icon"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="17 8 12 3 7 8" />
										<line x1="12" y1="3" x2="12" y2="15" />
									</svg>
								</span>
								<div className="import-text">
									<h3>Add / Import Script</h3>
									<p>Drag & drop a file here, or click to choose</p>
								</div>
							</div>
						</div>

						{/* Centered Check for updates link */}
						<div className="sidebar-update-row">
							<button
								type="button"
								className="link-btn update-link-btn"
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
								{isCheckingUpdates || isUpdatingAll ? (
									<>
										<svg
											aria-hidden="true"
											viewBox="0 0 24 24"
											width="14"
											height="14"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="svg-icon animate-spin"
										>
											<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
										</svg>
										<span>
											{isCheckingUpdates ? "Checking..." : "Updating..."}
										</span>
									</>
								) : hasCheckedUpdates && availableUpdates > 0 ? (
									<>
										<svg
											aria-hidden="true"
											viewBox="0 0 24 24"
											width="14"
											height="14"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="svg-icon"
										>
											<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
										</svg>
										<span>Update all scripts ({availableUpdates})</span>
									</>
								) : hasCheckedUpdates && availableUpdates === 0 ? (
									<>
										<svg
											aria-hidden="true"
											viewBox="0 0 24 24"
											width="14"
											height="14"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="svg-icon"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										<span>Up to date</span>
									</>
								) : (
									<>
										<svg
											aria-hidden="true"
											viewBox="0 0 24 24"
											width="14"
											height="14"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="svg-icon"
										>
											<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
										</svg>
										<span>Check for updates</span>
									</>
								)}
							</button>
						</div>

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
								<span className="search-icon">
									<svg
										aria-hidden="true"
										viewBox="0 0 24 24"
										width="14"
										height="14"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="svg-icon"
									>
										<circle cx="11" cy="11" r="8" />
										<line x1="21" y1="21" x2="16.65" y2="16.65" />
									</svg>
								</span>
								<input
									type="text"
									placeholder="Search scripts..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
								{searchQuery && (
									<button
										type="button"
										className="search-clear-btn"
										onClick={() => setSearchQuery("")}
										title="Clear search"
									>
										<svg
											aria-hidden="true"
											viewBox="0 0 24 24"
											width="12"
											height="12"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<line x1="18" y1="6" x2="6" y2="18" />
											<line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								)}
							</div>
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
									const firstLetter =
										name.trim().charAt(0).toUpperCase() || "S";

									let updateLabel = "";
									if (hasCheckedUpdates) {
										if (updateInfo?.hasUpdate) {
											updateLabel = `Update available: ${updateInfo.currentVersion ?? "?"} -> ${updateInfo.nextVersion ?? "?"}`;
										} else if (updateInfo?.error) {
											updateLabel = `Update check failed: ${updateInfo.error}`;
										} else if (updateInfo?.canUpdate) {
											updateLabel = `Up to date${updateInfo.currentVersion ? ` (${updateInfo.currentVersion})` : ""}`;
										}
									}

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
												<div className="script-type-icon">{firstLetter}</div>
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

												{updateLabel &&
													(updateInfo?.hasUpdate ? (
														<button
															type="button"
															className="card-update-status clickable"
															onClick={(e) => {
																e.stopPropagation();
																void handleUpdateScript(script.id);
															}}
														>
															{updateLabel}
														</button>
													) : (
														<div
															className={`card-update-status ${updateInfo?.error ? "error" : ""}`}
														>
															{updateLabel}
														</div>
													))}

												<div className="card-metadata-row text-muted">
													<span className="meta-item">
														v{script.meta.version ?? "1.0.0"}
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
											</div>
										</div>
									);
								})
							)}
						</div>
					</aside>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: drag resizer handle */}
					<div
						className={`sidebar-resizer ${isResizing ? "resizing" : ""}`}
						onMouseDown={startResizing}
					/>

					{/* Right pane: integrated editor/collapsible-metadata split view or dashboard welcome */}
					<main className="main-content">
						{selectedScript ? (
							<div className="editor-view">
								{/* Editor title panel */}
								<header className="editor-view-header">
									<div className="header-left">
										<div className="editor-title-block">
											<h2>
												{selectedScript.meta.name ?? selectedScript.filename}
											</h2>
											<span
												className={`status-label ${selectedScript.enabled ? "enabled" : "disabled"}`}
											>
												{selectedScript.enabled ? "Enabled" : "Disabled"}
											</span>
											{hasSyntaxError && (
												<span
													className="tab-error-badge"
													style={{ marginLeft: "8px" }}
												>
													✕ 1 error
												</span>
											)}
										</div>
									</div>

									{/* Header action buttons */}
									<div className="editor-view-header-actions">
										{saveStatus === "unsaved" && (
											<span className="unsaved-header-label">
												<span className="unsaved-status-dot" />
												<span>Unsaved changes</span>
											</span>
										)}
										<button
											type="button"
											className="btn btn-danger-outline"
											id="btn-delete-details"
											onClick={() => handleRemove(selectedScript)}
											title="Delete Script"
										>
											<svg
												aria-hidden="true"
												viewBox="0 0 24 24"
												width="14"
												height="14"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="svg-icon"
											>
												<polyline points="3 6 5 6 21 6" />
												<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
											</svg>
											<span>Delete Script</span>
										</button>
										<button
											type="button"
											className="btn btn-primary btn-save-changes-styled"
											id="btn-save-script"
											onClick={handleSave}
											disabled={
												!hasChanges || hasSyntaxError || saveStatus === "saving"
											}
											title={
												saveStatus === "saving" ? "Saving..." : "Save Changes"
											}
										>
											<svg
												aria-hidden="true"
												viewBox="0 0 24 24"
												width="14"
												height="14"
												fill="none"
												stroke="currentColor"
												strokeWidth="2.5"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="svg-icon"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
											<span>
												{saveStatus === "saving" ? "Saving..." : "Save Changes"}
											</span>
										</button>
									</div>
								</header>

								{/* Hidden status elements for E2E tests */}
								<div style={{ display: "none" }}>
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
										<span className="status-badge tag-error">Error</span>
									)}
								</div>

								{/* Split Workspace */}
								<div className="editor-workspace">
									<div className="editor-wrapper-box">
										{hasSyntaxError && syntaxErrorMessage && (
											<div
												id="syntax-error-banner"
												className="syntax-error-alert"
											>
												<svg
													aria-hidden="true"
													viewBox="0 0 24 24"
													width="16"
													height="16"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="svg-icon"
												>
													<circle cx="12" cy="12" r="10" />
													<line x1="12" y1="8" x2="12" y2="12" />
													<line x1="12" y1="16" x2="12.01" y2="16" />
												</svg>
												<span>Syntax Error: {syntaxErrorMessage}</span>
											</div>
										)}
										{!hasSyntaxError &&
											saveStatus === "error" &&
											errorMessage && (
												<div className="syntax-error-alert">
													<svg
														aria-hidden="true"
														viewBox="0 0 24 24"
														width="16"
														height="16"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
														className="svg-icon"
													>
														<circle cx="12" cy="12" r="10" />
														<line x1="12" y1="8" x2="12" y2="12" />
														<line x1="12" y1="16" x2="12.01" y2="16" />
													</svg>
													<span>Error: {errorMessage}</span>
												</div>
											)}
										<CodeMirror
											value={code}
											height="100%"
											theme="dark"
											extensions={[javascript()]}
											onChange={handleCodeChange}
											className="codemirror-editor"
										/>
									</div>

									{/* Collapsible bottom metadata panel */}
									<div
										className={`metadata-panel ${isMetadataCollapsed ? "collapsed" : ""}`}
									>
										<button
											type="button"
											className="metadata-header"
											onClick={() => {
												const nextState = !isMetadataCollapsed;
												setIsMetadataCollapsed(nextState);
												localStorage.setItem(
													"metadata_collapsed",
													String(nextState),
												);
											}}
										>
											<div className="metadata-title">
												<svg
													aria-hidden="true"
													viewBox="0 0 24 24"
													width="14"
													height="14"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="svg-icon"
												>
													<circle cx="12" cy="12" r="10" />
													<line x1="12" y1="16" x2="12" y2="12" />
													<line x1="12" y1="8" x2="12.01" y2="8" />
												</svg>
												<span>Script Details & Metadata</span>
											</div>
											<svg
												aria-hidden="true"
												viewBox="0 0 24 24"
												width="14"
												height="14"
												fill="none"
												stroke="currentColor"
												strokeWidth="2.5"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="chevron-icon"
											>
												<polyline points="18 15 12 9 6 15" />
											</svg>
										</button>
										<div className="metadata-content">
											<div className="metadata-grid">
												{/* Card 1: General */}
												<div className="metadata-card">
													<div className="metadata-card-header">
														<svg
															aria-hidden="true"
															viewBox="0 0 24 24"
															width="14"
															height="14"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="svg-icon"
														>
															<line x1="8" y1="6" x2="21" y2="6" />
															<line x1="8" y1="12" x2="21" y2="12" />
															<line x1="8" y1="18" x2="21" y2="18" />
															<line x1="3" y1="6" x2="3.01" y2="6" />
															<line x1="3" y1="12" x2="3.01" y2="12" />
															<line x1="3" y1="18" x2="3.01" y2="18" />
														</svg>
														<span>General</span>
													</div>
													<div className="metadata-card-body">
														<div className="metadata-field">
															<span className="metadata-field-label">Name</span>
															<span className="metadata-field-value">
																{selectedScript.meta.name ??
																	selectedScript.filename}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Description
															</span>
															<span className="metadata-field-value">
																{selectedScript.meta.description ??
																	"Shows no description"}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Version
															</span>
															<span className="metadata-field-value">
																{selectedScript.meta.version ?? "1.0.0"}
															</span>
														</div>
														{selectedScript.meta.author && (
															<div className="metadata-field">
																<span className="metadata-field-label">
																	Author
																</span>
																<span className="metadata-field-value">
																	{selectedScript.meta.author}
																</span>
															</div>
														)}
														<div className="metadata-field">
															<span className="metadata-field-label">Size</span>
															<span className="metadata-field-value">
																{(selectedScript.source.length / 1024).toFixed(
																	1,
																)}{" "}
																KB
															</span>
														</div>
													</div>
												</div>

												{/* Card 2: Match Rules */}
												<div className="metadata-card">
													<div className="metadata-card-header">
														<svg
															aria-hidden="true"
															viewBox="0 0 24 24"
															width="14"
															height="14"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="svg-icon"
														>
															<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
														</svg>
														<span>
															Match Rules ({selectedScript.meta.matches.length})
														</span>
													</div>
													<div className="metadata-card-body matches-list-container">
														{selectedScript.meta.matches.map((m) => (
															<div key={m} className="match-rule-item">
																<span className="match-icon-check">✓</span>
																<span className="match-pattern" title={m}>
																	{m}
																</span>
															</div>
														))}
													</div>
												</div>

												{/* Card 3: Execution */}
												<div className="metadata-card">
													<div className="metadata-card-header">
														<svg
															aria-hidden="true"
															viewBox="0 0 24 24"
															width="14"
															height="14"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="svg-icon"
														>
															<polygon points="5 3 19 12 5 21 5 3" />
														</svg>
														<span>Execution</span>
													</div>
													<div className="metadata-card-body">
														<div className="metadata-field">
															<span className="metadata-field-label">
																Enabled
															</span>
															<span
																className="metadata-field-value"
																style={{
																	color: selectedScript.enabled
																		? "var(--accent)"
																		: "var(--muted)",
																}}
															>
																{selectedScript.enabled ? "Yes" : "No"}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Run At
															</span>
															<span className="metadata-field-value">
																{selectedScript.meta["run-at"] ===
																"document-start"
																	? "document-start"
																	: "document-idle"}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Last Updated
															</span>
															<span className="metadata-field-value">
																{formatDate(
																	selectedScript.updatedAt ??
																		selectedScript.createdAt,
																)}
															</span>
														</div>
													</div>
												</div>

												{/* Card 4: Update */}
												<div className="metadata-card card-span-2">
													<div className="metadata-card-header">
														<svg
															aria-hidden="true"
															viewBox="0 0 24 24"
															width="14"
															height="14"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="svg-icon"
														>
															<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
														</svg>
														<span>Update</span>
													</div>
													<div className="metadata-card-body">
														<div className="metadata-field">
															<span className="metadata-field-label">
																Update URL
															</span>
															<span className="metadata-field-value font-mono">
																{selectedScript.meta.updateURL ??
																	selectedScript.meta.updateurl ??
																	"—"}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Download URL
															</span>
															<span className="metadata-field-value font-mono">
																{selectedScript.meta.downloadURL ??
																	selectedScript.meta.downloadurl ??
																	"—"}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Status
															</span>
															<span className="metadata-field-value">
																{(() => {
																	const updateInfo = updatesById.get(
																		selectedScript.id,
																	);
																	if (hasCheckedUpdates) {
																		if (updateInfo?.hasUpdate) {
																			return `Update available: ${updateInfo.currentVersion ?? "?"} -> ${updateInfo.nextVersion ?? "?"}`;
																		}
																		if (updateInfo?.error) {
																			return `Update check failed: ${updateInfo.error}`;
																		}
																		return "Up to date";
																	}
																	return "Not checked";
																})()}
															</span>
														</div>
													</div>
												</div>

												{/* Card 5: Advanced */}
												<div className="metadata-card">
													<div className="metadata-card-header">
														<svg
															aria-hidden="true"
															viewBox="0 0 24 24"
															width="14"
															height="14"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="svg-icon"
														>
															<circle cx="12" cy="12" r="3" />
															<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
														</svg>
														<span>Advanced</span>
													</div>
													<div className="metadata-card-body">
														<div className="metadata-field">
															<span className="metadata-field-label">
																Namespace
															</span>
															<span className="metadata-field-value font-mono">
																{selectedScript.meta.namespace ?? "—"}
															</span>
														</div>
														<div className="metadata-field">
															<span className="metadata-field-label">
																Grants
															</span>
															<span className="metadata-field-value font-mono">
																{selectedScript.meta.grant ?? "none"}
															</span>
														</div>
														{selectedScript.meta.include && (
															<div className="metadata-field">
																<span className="metadata-field-label">
																	Includes
																</span>
																<span className="metadata-field-value">
																	{Array.isArray(selectedScript.meta.include)
																		? selectedScript.meta.include.join(", ")
																		: selectedScript.meta.include}
																</span>
															</div>
														)}
														{selectedScript.meta.exclude && (
															<div className="metadata-field">
																<span className="metadata-field-label">
																	Excludes
																</span>
																<span className="metadata-field-value">
																	{Array.isArray(selectedScript.meta.exclude)
																		? selectedScript.meta.exclude.join(", ")
																		: selectedScript.meta.exclude}
																</span>
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="welcome-view">
								<div className="welcome-hero">
									<img
										src={chrome.runtime.getURL("images/icon.svg")}
										className="welcome-logo-img"
										alt="logo"
									/>
									<h1>Scriptmonkey Dashboard</h1>
									<p className="welcome-tagline">
										Select a script from the sidebar or drag and drop script
										files to manage them.
									</p>
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
