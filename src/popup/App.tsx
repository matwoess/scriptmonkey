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

	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setAddError("");
		try {
			const files = Array.from(e.target.files ?? []);
			if (!files.length) return;

			const newScripts = await Promise.all(
				files.map(async (file) => ({
					filename: file.name,
					source: await file.text(),
				})),
			);

			await send({ type: "addScripts", scripts: newScripts });
			await chrome.tabs.reload();
			await loadData();
		} catch (error) {
			setAddError(error instanceof Error ? error.message : String(error));
		} finally {
			if (e.target) e.target.value = "";
		}
	};

	const handleToggle = async (id: string) => {
		await send({ type: "toggleScript", id });
		await chrome.tabs.reload();
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
					await chrome.tabs.reload();
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
		<>
			<header>
				<h1>Scriptmonkey</h1>
				<div className="count" id="count">
					{scripts.length} script{scripts.length === 1 ? "" : "s"}
				</div>
			</header>

			{!userScriptsAvailable && (
				<div className="banner" id="warning">
					Allow User Scripts is disabled for this extension. Enable it in
					chrome://extensions before scripts can run.
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

			{canUpdateAny && (
				<div className="toolbar">
					<div className="toolbar-info" id="update-status">
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
					<div style={{ display: "flex", gap: "8px" }}>
						<button
							type="button"
							className="btn"
							onClick={() => void handleCheckUpdates()}
							disabled={isCheckingUpdates}
						>
							Check for updates
						</button>
						{hasCheckedUpdates && availableUpdates > 0 && (
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => void handleUpdateAll()}
								disabled={isUpdatingAll}
							>
								Update all
							</button>
						)}
					</div>
				</div>
			)}

			<div id="active-section">
				<div className="section-label">Active on this page</div>
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
							/>
						))
					) : (
						<div className="empty">No scripts for this page</div>
					)}
				</div>
			</div>

			{otherScripts.length > 0 && (
				<div id="other-section">
					<div className="section-label">Other scripts</div>
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
							/>
						))}
					</div>
				</div>
			)}

			<div className="actions">
				<button
					type="button"
					className="btn btn-primary"
					id="btn-add-file"
					onClick={() => {
						fileInputRef.current?.click();
					}}
				>
					+ Add file
				</button>
				<input
					type="file"
					id="file-input"
					accept=".js,.user.js"
					multiple
					hidden
					ref={fileInputRef}
					onChange={handleAddFiles}
				/>
			</div>

			<div
				id="confirm-modal"
				className={`modal-overlay ${confirmModal?.show ? "show" : ""}`}
			>
				<div className="modal">
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
							className="btn btn-primary"
							id="confirm-ok"
							onClick={confirmModal?.onConfirm}
						>
							OK
						</button>
					</div>
				</div>
			</div>
		</>
	);
}

function ScriptItem({
	script,
	updateInfo,
	hasCheckedUpdates,
	onToggle,
	onRemove,
	onUpdate,
}: {
	script: Script;
	updateInfo?: UpdateInfo;
	hasCheckedUpdates: boolean;
	onToggle: () => void;
	onRemove: () => void;
	onUpdate: () => void;
}) {
	const name = script.meta.name ?? script.filename;
	const desc = script.meta.description ?? "";
	const match = script.meta.matches.join(", ");

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
			<div className="script-info">
				<div className="script-name">{name}</div>
				{desc && <div className="script-desc">{desc}</div>}
				<div className="script-match">{match}</div>
				{updateLabel && <div className="script-update">{updateLabel}</div>}
			</div>
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
