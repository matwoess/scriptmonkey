import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtensionMessage, Script, UpdateInfo } from "../types";
import { matchPattern } from "../utils/matching";

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

async function getCurrentTabUrl(): Promise<string> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab?.url ?? "";
}

function isActiveOnUrl(script: Script, url: string): boolean {
	return script.meta.matches.some((p) => matchPattern(p, url));
}

export default function App() {
	const [scripts, setScripts] = useState<Script[]>([]);
	const [userScriptsAvailable, setUserScriptsAvailable] =
		useState<boolean>(true);
	const [currentUrl, setCurrentUrl] = useState<string>("");
	const [updatesById, setUpdatesById] = useState<Map<string, UpdateInfo>>(
		new Map(),
	);
	const [hasCheckedUpdates, setHasCheckedUpdates] = useState<boolean>(false);
	const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
	const [isUpdatingAll, setIsUpdatingAll] = useState<boolean>(false);
	const [updateError, setUpdateError] = useState<string>("");
	const [addError, setAddError] = useState<string>("");
	const [confirmModal, setConfirmModal] = useState<{
		show: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);
	const [selectedScript, setSelectedScript] = useState<Script | null>(null);
	const [isDragging, setIsDragging] = useState<boolean>(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const openDashboard = async (editScriptId?: string) => {
		const url = chrome.runtime.getURL(
			`dashboard.html${editScriptId ? `?edit=${editScriptId}` : ""}`,
		);
		const tabs = await chrome.tabs.query({
			url: `${chrome.runtime.getURL("dashboard.html")}*`,
		});
		if (tabs.length > 0 && tabs[0].id !== undefined) {
			await chrome.tabs.update(tabs[0].id, { active: true });
			if (editScriptId) {
				await chrome.tabs.update(tabs[0].id, { url });
			}
		} else {
			await chrome.tabs.create({ url });
		}
	};

	const loadData = useCallback(async () => {
		const url = await getCurrentTabUrl();
		setCurrentUrl(url);

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

	const processFiles = async (files: File[]) => {
		setAddError("");
		try {
			const newScripts = await Promise.all(
				files.map(async (file) => ({
					filename: file.name,
					source: await file.text(),
				})),
			);

			await send({ type: "addScripts", scripts: newScripts });
			const loadedScripts = await send<Script[]>({ type: "getScripts" });
			const anyActive = newScripts.some((ns) => {
				const parsed = loadedScripts.find((s) => s.filename === ns.filename);
				return parsed && isActiveOnUrl(parsed, currentUrl);
			});
			if (anyActive) {
				await chrome.tabs.reload();
			}
			await loadData();
		} catch (error) {
			setAddError(error instanceof Error ? error.message : String(error));
		}
	};

	const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (!files.length) return;
		void processFiles(files);
		if (e.target) e.target.value = "";
	};

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

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		const files = Array.from(e.dataTransfer.files ?? []);
		if (!files.length) return;
		void processFiles(files);
	};

	const handleToggle = async (id: string) => {
		await send({ type: "toggleScript", id });
		const script = scripts.find((s) => s.id === id);
		if (script && isActiveOnUrl(script, currentUrl)) {
			await chrome.tabs.reload();
		}
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
					if (script.enabled && isActiveOnUrl(script, currentUrl)) {
						await chrome.tabs.reload();
					}
					await loadData();
				})();
			},
		});
	};

	const handleUpdate = async (id: string) => {
		try {
			await send({ type: "updateScript", id });
			await refreshUpdates();
			await chrome.tabs.reload();
			await loadData();
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
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
		setUpdateError("");
		try {
			await refreshUpdates();
		} catch (error) {
			setUpdateError("Update check failed");
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
			await chrome.tabs.reload();
			await loadData();
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		} finally {
			setIsUpdatingAll(false);
		}
	};

	const activeScripts = scripts.filter((s) => isActiveOnUrl(s, currentUrl));
	const otherScripts = scripts.filter((s) => !isActiveOnUrl(s, currentUrl));
	const canUpdateAny = scripts.some(
		(s) => s.meta.downloadurl || s.meta.updateurl,
	);
	const availableUpdates = Array.from(updatesById.values()).filter(
		(u) => u.hasUpdate,
	).length;
	const checkableUpdates = Array.from(updatesById.values()).filter(
		(u) => u.canUpdate,
	).length;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drag drop container
		<div
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			style={{ minHeight: "100vh", position: "relative" }}
		>
			{isDragging && (
				<div className="drag-overlay">
					<div className="drag-overlay-message">
						<span className="overlay-emoji">🐒</span>
						<h2>Drop scripts here!</h2>
						<p>Accepts .js and .user.js files</p>
					</div>
				</div>
			)}
			<header>
				<h1>Scriptmonkey</h1>
				<div className="header-actions">
					{scripts.length > 0 && (
						<button
							type="button"
							className={
								hasCheckedUpdates && availableUpdates > 0
									? "btn btn-header btn-accent"
									: "btn btn-header"
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
									? `Update ${availableUpdates} script${availableUpdates === 1 ? "" : "s"}`
									: "Check for updates"}
						</button>
					)}
					<button
						type="button"
						className="btn btn-header btn-primary"
						id="btn-manage"
						onClick={() => void openDashboard()}
					>
						Manage
					</button>
				</div>

				{/* Hidden elements for E2E tests */}
				<div id="count" className="sr-only">
					{scripts.length} script{scripts.length === 1 ? "" : "s"}
				</div>
				<div id="update-status" className="sr-only">
					{isCheckingUpdates
						? "Checking..."
						: updateError
							? updateError
							: hasCheckedUpdates
								? checkableUpdates
									? `${availableUpdates} update${availableUpdates === 1 ? "" : "s"} available`
									: "No update URLs"
								: ""}
				</div>
			</header>

			{!userScriptsAvailable && (
				<div className="banner" id="warning">
					"Allow User Scripts" is disabled for this extension. This permission
					is required in order to run user scripts on web pages.{" "}
					<button
						type="button"
						onClick={() => {
							chrome.tabs.create({
								url: `chrome://extensions/?id=${chrome.runtime.id}`,
							});
						}}
						style={{
							background: "none",
							border: "none",
							padding: 0,
							color: "inherit",
							textDecoration: "underline",
							cursor: "pointer",
							font: "inherit",
						}}
					>
						Open extension settings
					</button>{" "}
					to enable it.
				</div>
			)}

			{addError && (
				<div
					className="banner"
					style={{
						color: "#ef4444",
						borderColor: "#ef4444",
						backgroundColor: "rgba(239, 68, 68, 0.1)",
					}}
				>
					Error adding scripts: {addError}
				</div>
			)}

			{scripts.length === 0 ? (
				<div className="empty-state-welcome">
					<img
						src={chrome.runtime.getURL("images/icon.svg")}
						className="welcome-logo-img"
						alt="logo"
					/>
					<h2>Get Started with Scriptmonkey</h2>
					<p className="welcome-desc">
						You haven't added any user scripts yet. User scripts allow you to
						customize and automate your favorite websites.
					</p>
					<div className="welcome-steps">
						<div className="step-item">
							<span className="step-number">1</span>
							<p>
								Click the <strong>Manage</strong> button to open the dashboard.
							</p>
						</div>
						<div className="step-item">
							<span className="step-number">2</span>
							<p>
								Or <strong>drag and drop</strong> multiple script files directly
								here.
							</p>
						</div>
						<div className="step-item">
							<span className="step-number">3</span>
							<p>
								Scripts with Tampermonkey syntax (with <code>@updateURL</code>)
								can be updated automatically.
							</p>
						</div>
					</div>
					<button
						type="button"
						className="btn btn-welcome"
						onClick={() => void openDashboard()}
					>
						Manage scripts
					</button>
				</div>
			) : (
				<>
					<div id="active-section">
						<div className="section-label">
							<span className="section-count">{activeScripts.length}</span>{" "}
							Active on this page
						</div>
						<div id="active-list">
							{activeScripts.length > 0 ? (
								activeScripts.map((script) => (
									<ScriptItem
										key={script.id}
										script={script}
										updateInfo={updatesById.get(script.id)}
										hasCheckedUpdates={hasCheckedUpdates}
										onToggle={() => {
											void handleToggle(script.id);
										}}
										onRemove={() => handleRemove(script)}
										onUpdate={() => {
											void handleUpdate(script.id);
										}}
										onSelect={() => setSelectedScript(script)}
									/>
								))
							) : (
								<div className="empty">No scripts for this page</div>
							)}
						</div>
					</div>

					{otherScripts.length > 0 && (
						<div id="other-section">
							<div className="section-label">
								<span className="section-count">{otherScripts.length}</span>{" "}
								Other scripts
							</div>
							<div id="other-list">
								{otherScripts.map((script) => (
									<ScriptItem
										key={script.id}
										script={script}
										updateInfo={updatesById.get(script.id)}
										hasCheckedUpdates={hasCheckedUpdates}
										onToggle={() => {
											void handleToggle(script.id);
										}}
										onRemove={() => handleRemove(script)}
										onUpdate={() => {
											void handleUpdate(script.id);
										}}
										onSelect={() => setSelectedScript(script)}
									/>
								))}
							</div>
						</div>
					)}
				</>
			)}

			<input
				type="file"
				id="file-input"
				accept=".js,.user.js"
				multiple
				hidden
				ref={fileInputRef}
				onChange={handleAddFiles}
			/>

			<div
				id="confirm-modal"
				className={`modal ${confirmModal?.show ? "show" : ""}`}
			>
				<div className="modal-content">
					<h3 id="confirm-title">{confirmModal?.title}</h3>
					<p id="confirm-message">{confirmModal?.message}</p>
					<div className="modal-actions">
						<button
							type="button"
							className="btn"
							id="confirm-cancel"
							onClick={() => setConfirmModal(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="btn btn-danger"
							id="confirm-ok"
							onClick={confirmModal?.onConfirm}
						>
							Remove
						</button>
					</div>
				</div>
			</div>

			{selectedScript && (
				<div className="modal show" id="details-modal">
					<div className="modal-content details-modal-content">
						<h3 style={{ marginBottom: "16px" }}>Script Details</h3>
						<div className="details-scroll">
							<div className="detail-row">
								<span className="detail-label">Name</span>
								<span className="detail-val">
									{selectedScript.meta.name ?? selectedScript.filename}
								</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Version</span>
								<span className="detail-val">
									{selectedScript.meta.version ?? "N/A"}
								</span>
							</div>
							{selectedScript.meta.description && (
								<div className="detail-row">
									<span className="detail-label">Description</span>
									<span className="detail-val">
										{selectedScript.meta.description}
									</span>
								</div>
							)}
							<div className="detail-row">
								<span className="detail-label">Filename</span>
								<span className="detail-val font-mono">
									{selectedScript.filename}
								</span>
							</div>
							{selectedScript.meta.namespace && (
								<div className="detail-row">
									<span className="detail-label">Namespace</span>
									<span className="detail-val font-mono">
										{selectedScript.meta.namespace}
									</span>
								</div>
							)}
							<div className="detail-row">
								<span className="detail-label">Matches</span>
								<div className="detail-val matches-list">
									{selectedScript.meta.matches.map((m) => (
										<code key={m}>{m}</code>
									))}
								</div>
							</div>
							{selectedScript.meta["run-at"] && (
								<div className="detail-row">
									<span className="detail-label">Run At</span>
									<span className="detail-val">
										{selectedScript.meta["run-at"]}
									</span>
								</div>
							)}
							{selectedScript.meta.grant && (
								<div className="detail-row">
									<span className="detail-label">Grants</span>
									<span className="detail-val font-mono">
										{selectedScript.meta.grant}
									</span>
								</div>
							)}
							<div className="detail-row">
								<span className="detail-label">Size</span>
								<span className="detail-val">
									{(selectedScript.source.length / 1024).toFixed(2)} KB (
									{selectedScript.source.length} chars)
								</span>
							</div>
							<div className="detail-row">
								<span className="detail-label">Created</span>
								<span className="detail-val">
									{new Date(selectedScript.createdAt).toLocaleString()}
								</span>
							</div>
							{selectedScript.updatedAt && (
								<div className="detail-row">
									<span className="detail-label">Updated</span>
									<span className="detail-val">
										{new Date(selectedScript.updatedAt).toLocaleString()}
									</span>
								</div>
							)}
						</div>
						<div className="modal-actions">
							<button
								type="button"
								className="btn btn-primary"
								id="btn-edit-script"
								onClick={() => {
									void openDashboard(selectedScript.id);
									setSelectedScript(null);
								}}
							>
								Edit script
							</button>
							<button
								type="button"
								className="btn btn-danger"
								id="btn-delete-details"
								onClick={() => {
									handleRemove(selectedScript);
									setSelectedScript(null);
								}}
							>
								Remove
							</button>
							<button
								type="button"
								className="btn"
								id="btn-close-details"
								onClick={() => setSelectedScript(null)}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function ScriptItem({
	script,
	updateInfo,
	hasCheckedUpdates,
	onToggle,
	onRemove,
	onUpdate,
	onSelect,
}: {
	script: Script;
	updateInfo?: UpdateInfo;
	hasCheckedUpdates: boolean;
	onToggle: () => void;
	onRemove: () => void;
	onUpdate: () => void;
	onSelect: () => void;
}) {
	const name = script.meta.name ?? script.filename;
	const desc = script.meta.description ?? "";

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
		<div className="script-item">
			<button type="button" className="script-info" onClick={onSelect}>
				<div className="script-name">{name}</div>
				{desc && <div className="script-desc">{desc}</div>}
				<div className="script-matches">
					{script.meta.matches.map((m) => (
						<div key={m} className="script-match">
							{m}
						</div>
					))}
				</div>
				{updateLabel && (
					<div className={`script-update ${updateInfo?.error ? "error" : ""}`}>
						{updateLabel}
					</div>
				)}
			</button>
			{hasCheckedUpdates && updateInfo?.hasUpdate && (
				<button type="button" className="btn btn-update" onClick={onUpdate}>
					Update
				</button>
			)}
			<label className="toggle">
				<input type="checkbox" checked={script.enabled} onChange={onToggle} />
				<span className="slider"></span>
			</label>
			<button
				type="button"
				className="btn-remove"
				title="Remove"
				onClick={onRemove}
			>
				&times;
			</button>
		</div>
	);
}
