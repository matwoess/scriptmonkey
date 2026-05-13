export interface ScriptMeta {
	name?: string;
	namespace?: string;
	version?: string;
	description?: string;
	matches: string[];
	"run-at"?: string;
	grant?: string;
	updateURL?: string;
	downloadURL?: string;
	[key: string]: string | string[] | undefined;
}

export interface Script {
	id: string;
	filename: string;
	source: string;
	meta: ScriptMeta;
	enabled: boolean;
	createdAt: number;
	updatedAt?: number;
}

export interface UpdateInfo {
	id: string;
	canUpdate: boolean;
	hasUpdate: boolean;
	currentVersion: string | null;
	nextVersion: string | null;
	error?: string;
}

export type ExtensionMessage =
	| { type: "getScripts" }
	| { type: "addScripts"; scripts: { filename: string; source: string }[] }
	| { type: "removeScript"; id: string }
	| { type: "toggleScript"; id: string }
	| { type: "updateScript"; id: string; source: string }
	| { type: "checkForUpdates" };
