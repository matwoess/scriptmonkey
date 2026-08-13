import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import type { ReactNode } from "react";
import { useState } from "react";
import styles from "./index.module.css";

function HeroHeader() {
	return (
		<header className={styles.heroBanner}>
			<div className={styles.heroContent}>
				<div className={styles.heroLogoContainer}>
					<img src="icon.svg" width="72" height="72" alt="Scriptmonkey Logo" />
				</div>

				<div className={styles.badgePill}>
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="10" />
						<circle cx="12" cy="12" r="4" />
						<line x1="21.17" y1="8" x2="12" y2="8" />
						<line x1="3.95" y1="6.06" x2="8.54" y2="14" />
						<line x1="10.88" y1="21.94" x2="15.46" y2="14" />
					</svg>
					<span>Manifest V3 Native Extension</span>
				</div>

				<Heading as="h1" className={styles.heroTitle}>
					Customize any website with{" "}
					<span className={styles.gradientText}>User Scripts</span>
				</Heading>

				<p className={styles.heroSubtitle}>
					Scriptmonkey is a minimal, free, open-source user script manager built
					for Google Chrome.
				</p>

				<div className={styles.ctaButtons}>
					<a
						className={`btn btn-primary btn-glow ${styles.primaryBtn}`}
						href="https://chromewebstore.google.com/detail/scriptmonkey-beta/afmgkdanppbobipehgpfcmhpgeoejcpn"
						target="_blank"
						rel="noopener noreferrer"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="10" />
							<circle cx="12" cy="12" r="4" />
							<line x1="21.17" y1="8" x2="12" y2="8" />
							<line x1="3.95" y1="6.06" x2="8.54" y2="14" />
							<line x1="10.88" y1="21.94" x2="15.46" y2="14" />
						</svg>
						Add to Chrome
					</a>

					<Link
						className={`btn btn-secondary btn-glow ${styles.secondaryBtn}`}
						to="/docs/overview"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
							<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
						</svg>
						Documentation
					</Link>

					<a
						className={`btn btn-secondary btn-glow ${styles.secondaryBtn}`}
						href="https://github.com/matwoess/scriptmonkey"
						target="_blank"
						rel="noopener noreferrer"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
						</svg>
						GitHub
					</a>
				</div>

				<InteractiveMockup />
			</div>
		</header>
	);
}

function InteractiveMockup() {
	const [activeTab, setActiveTab] = useState<"editor" | "metadata">("editor");

	return (
		<div className={styles.mockupContainer}>
			<div className={styles.mockupHeader}>
				<div className={styles.mockupHeaderLeft}>
					<span className={styles.mockupHeaderTitle}>
						Scriptmonkey Dashboard
					</span>
				</div>
				<div className={styles.mockupHeaderRight}>
					<span className={styles.mockupSavedBadge}>Saved</span>
				</div>
			</div>

			<div className={styles.mockupBody}>
				<div className={styles.mockupSidebar}>
					<div className={styles.mockupBrandRow}>
						<img
							src="icon.svg"
							width="16"
							height="16"
							alt="Scriptmonkey"
							className={styles.brandIconSmall}
						/>
						<span className={styles.sidebarBrandTitle}>Scriptmonkey</span>
					</div>

					<div
						className={`btn btn-primary btn-glow ${styles.mockupNewScriptBtn}`}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						<span>New Script</span>
					</div>

					<div className={styles.mockupImportZone}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						<div className={styles.importTextGroup}>
							<strong>Add / Import Script</strong>
							<span>Drag & drop a file here</span>
						</div>
					</div>

					<div className={styles.mockupSearchBox}>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<span>Search scripts...</span>
					</div>

					<div className={styles.sidebarSectionTitle}>All Scripts (3)</div>

					<div className={styles.scriptListMock}>
						<div className={`${styles.scriptCard} ${styles.scriptCardActive}`}>
							<div className={styles.scriptAvatar}>D</div>
							<div className={styles.scriptCardContent}>
								<div className={styles.scriptCardName}>Dark Theme Enforcer</div>
								<div className={styles.scriptCardBadges}>
									<span className={styles.matchBadge}>
										https://*.example.com/*
									</span>
								</div>
							</div>
						</div>

						<div className={styles.scriptCard}>
							<div className={styles.scriptAvatar}>G</div>
							<div className={styles.scriptCardContent}>
								<div className={styles.scriptCardName}>GitHub Clean Feed</div>
								<div className={styles.scriptCardBadges}>
									<span className={styles.matchBadge}>
										https://github.com/*
									</span>
								</div>
							</div>
						</div>

						<div className={styles.scriptCard}>
							<div className={styles.scriptAvatar}>Y</div>
							<div className={styles.scriptCardContent}>
								<div className={styles.scriptCardName}>YouTube Auto HD</div>
								<div className={styles.scriptCardBadges}>
									<span className={styles.matchBadge}>
										https://youtube.com/*
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className={styles.mockupContent}>
					<div className={styles.editorToolbar}>
						<div className={styles.editorTitleMeta}>
							<span className={styles.editorScriptName}>
								Dark Theme Enforcer
							</span>
							<span className={styles.editorVersionTag}>v1.2.0</span>
						</div>

						<div className={styles.tabList}>
							<button
								type="button"
								className={`${styles.tabBtn} ${activeTab === "editor" ? styles.tabBtnActive : ""}`}
								onClick={() => setActiveTab("editor")}
							>
								Code Editor
							</button>
							<button
								type="button"
								className={`${styles.tabBtn} ${activeTab === "metadata" ? styles.tabBtnActive : ""}`}
								onClick={() => setActiveTab("metadata")}
							>
								Parsed Metadata
							</button>
						</div>
					</div>

					{activeTab === "editor" ? (
						<div className={styles.editorPane}>
							<div className={styles.lineNumbers}>
								<span>1</span>
								<span>2</span>
								<span>3</span>
								<span>4</span>
								<span>5</span>
								<span>6</span>
								<span>7</span>
								<span>8</span>
								<span>9</span>
								<span>10</span>
								<span>11</span>
								<span>12</span>
								<span>13</span>
								<span>14</span>
								<span>15</span>
								<span>16</span>
							</div>
							<pre className={styles.codeSnippet}>
								<code>
									<span className={styles.cm}>{"// ==UserScript=="}</span>
									{"\n"}
									<span className={styles.cm}>
										{"// @name         Dark Theme Enforcer"}
									</span>
									{"\n"}
									<span className={styles.cm}>{"// @version      1.2.0"}</span>
									{"\n"}
									<span className={styles.cm}>
										{
											"// @description  Applies dark mode styling to example.com"
										}
									</span>
									{"\n"}
									<span className={styles.cm}>
										{"// @match        https://*.example.com/*"}
									</span>
									{"\n"}
									<span className={styles.cm}>
										{"// @run-at       document-idle"}
									</span>
									{"\n"}
									<span className={styles.cm}>{"// @grant        none"}</span>
									{"\n"}
									<span className={styles.cm}>{"// ==/UserScript=="}</span>
									{"\n"}
									{"\n"}(<span className={styles.kw}>function</span> () {"{"}
									{"\n"}
									{"  "}
									<span className={styles.str}>'use strict'</span>;{"\n"}
									{"  "}
									<span className={styles.kw}>const</span> darkCss ={" "}
									<span className={styles.str}>
										`body &#123; background: #101114 !important; color: #e0e0e0
										!important; &#125;`
									</span>
									;{"\n"}
									{"  "}
									<span className={styles.kw}>const</span> style = document.
									<span className={styles.fn}>createElement</span>(
									<span className={styles.str}>'style'</span>);{"\n"}
									{"  "}style.textContent = darkCss;{"\n"}
									{"  "}document.head.
									<span className={styles.fn}>appendChild</span>(style);{"\n"}
									{"  "}console.<span className={styles.fn}>log</span>(
									<span className={styles.str}>
										'[Scriptmonkey] Custom dark theme applied!'
									</span>
									);{"\n"}
									{"}"})();
								</code>
							</pre>
						</div>
					) : (
						<div className={styles.metadataContainer}>
							<div className={styles.metadataCard}>
								<div className={styles.metadataCardTitle}>
									General Information
								</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>@name</span>
									<span className={styles.metadataVal}>
										"Dark Theme Enforcer"
									</span>
								</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>@version</span>
									<span className={styles.metadataVal}>"1.2.0"</span>
								</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>@description</span>
									<span className={styles.metadataVal}>
										"Applies dark mode styling to example.com"
									</span>
								</div>
							</div>

							<div className={styles.metadataCard}>
								<div className={styles.metadataCardTitle}>Match Rules</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>@match</span>
									<span className={styles.metadataBadgeVal}>
										https://*.example.com/*
									</span>
								</div>
							</div>

							<div className={styles.metadataCard}>
								<div className={styles.metadataCardTitle}>Execution Target</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>Target API</span>
									<span className={styles.metadataVal}>
										Chrome MV3 userScripts
									</span>
								</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>Execution World</span>
									<span className={styles.metadataVal}>MAIN</span>
								</div>
								<div className={styles.metadataRow}>
									<span className={styles.metadataKey}>Injection Timing</span>
									<span className={styles.metadataVal}>document-idle</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function FeatureGrid() {
	const features = [
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
			),
			title: "Built on Manifest V3",
			desc: "Built specifically for modern Chrome using the native userScripts API. Runs locally and respects your privacy.",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
					<line x1="3" y1="9" x2="21" y2="9" />
					<line x1="9" y1="21" x2="9" y2="9" />
				</svg>
			),
			title: "Standard UserScript Support",
			desc: "Uses scripts with metadata headers (@name, @match, @include, @exclude, @version, ...) used by other script managers such as Tampermonkey, Greasemonkey, and Violentmonkey.",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
					<line x1="8" y1="21" x2="16" y2="21" />
					<line x1="12" y1="17" x2="12" y2="21" />
				</svg>
			),
			title: "Popup & Dashboard UIs",
			desc: "Toolbar popup to toggle active scripts on current pages and a full dashboard to manage your script library.",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
				</svg>
			),
			title: "Automatic Script Updates",
			desc: "Compares script version tags against remote @updateURL or @downloadURL endpoints for manual or batch updates.",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
			),
			title: "Drag & Drop Import",
			desc: "Import local .user.js or .js files by dragging them into the dashboard or selecting them from your disk.",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<polyline points="16 18 22 12 16 6" />
					<polyline points="8 6 2 12 8 18" />
				</svg>
			),
			title: "Embedded Code Editor",
			desc: "Built-in CodeMirror 6 editor with syntax highlighting, line numbers, error diagnostics, and Ctrl+S quick save.",
		},
	];

	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<span className={styles.sectionTag}>Features</span>
				<Heading as="h2" className={styles.sectionTitle}>
					Simple, Focused Capabilities
				</Heading>
				<p className={styles.sectionSubtitle}>
					A lightweight user script manager focused on standard UserScript
					compatibility and local execution.
				</p>
			</div>

			<div className={styles.featureGrid}>
				{features.map((item) => (
					<div key={item.title} className={styles.featureCard}>
						<div className={styles.featureIcon}>{item.icon}</div>
						<h3 className={styles.featureTitle}>{item.title}</h3>
						<p className={styles.featureDesc}>{item.desc}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function UseCasesShowcase() {
	const useCases = [
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
				</svg>
			),
			title: "Custom Themes & Styling",
			desc: "Inject custom CSS or dark modes onto any web page to tailor site aesthetics to your liking.",
			example: "Dark mode enforcers, custom typography, layout tweaks",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
				</svg>
			),
			title: "Distraction-Free Browsing",
			desc: "Clean up news feeds, hide annoying sidebars, or remove sticky popups across your favorite platforms.",
			example: "Clean feed layouts, auto-expand content, ad cleanup",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
				</svg>
			),
			title: "Workflow & Shortcuts",
			desc: "Automate repetitive clicks, add keyboard navigation shortcuts, or pre-fill web forms automatically.",
			example: "Keyboard shortcuts, auto-focus search, form automation",
		},
		{
			icon: (
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<path d="M12 8v8M8 12h8" />
				</svg>
			),
			title: "Custom Buttons & UI Widgets",
			desc: "Inject custom buttons, action toolbars, or interactive DOM elements directly into web page layouts.",
			example: "Download buttons, quick action toolbars, custom UI widgets",
		},
	];

	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<span className={styles.sectionTag}>Use Cases</span>
				<Heading as="h2" className={styles.sectionTitle}>
					Real-World Web Customization
				</Heading>
				<p className={styles.sectionSubtitle}>
					Enhance your daily web browsing experience with lightweight user
					scripts tailored for your needs.
				</p>
			</div>

			<div className={styles.useCaseGrid}>
				{useCases.map((item) => (
					<div key={item.title} className={styles.useCaseCard}>
						<div className={styles.useCaseHeader}>
							<div className={styles.useCaseIcon}>{item.icon}</div>
							<h3 className={styles.useCaseTitle}>{item.title}</h3>
						</div>
						<p className={styles.useCaseDesc}>{item.desc}</p>
						<div className={styles.useCaseExample}>
							<strong>Examples:</strong> {item.example}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function HowItWorks() {
	const steps = [
		{
			num: "1",
			title: "Install Extension",
			desc: 'Add Scriptmonkey to Chrome from the Web Store and enable "Allow User Scripts" in chrome://extensions.',
		},
		{
			num: "2",
			title: "Create or Import",
			desc: 'Click "Add / Import Script" in the dashboard or drag .user.js files directly into the window.',
		},
		{
			num: "3",
			title: "Automate",
			desc: "Scripts execute automatically on matching web pages when enabled.",
		},
	];

	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<span className={styles.sectionTag}>Quick Start</span>
				<Heading as="h2" className={styles.sectionTitle}>
					Get Up and Running in 3 Easy Steps
				</Heading>
			</div>

			<div className={styles.stepGrid}>
				{steps.map((step) => (
					<div key={step.num} className={styles.stepCard}>
						<div className={styles.stepHeader}>
							<div className={styles.stepNumber}>{step.num}</div>
							<h3 className={styles.stepTitle}>{step.title}</h3>
						</div>
						<p className={styles.stepDesc}>{step.desc}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function BottomCTA() {
	return (
		<section className={styles.bottomSection}>
			<div className={styles.bottomCta}>
				<Heading as="h2" className={styles.bottomCtaTitle}>
					Ready to manage your user scripts?
				</Heading>
				<p className={styles.bottomCtaDesc}>
					Install Scriptmonkey today for a minimal, lightweight user script
					manager in Chrome.
				</p>
				<div className={styles.bottomCtaButtons}>
					<a
						className={`btn btn-primary btn-glow ${styles.primaryBtn}`}
						href="https://chromewebstore.google.com/detail/scriptmonkey-beta/afmgkdanppbobipehgpfcmhpgeoejcpn"
						target="_blank"
						rel="noopener noreferrer"
					>
						Install Extension
					</a>
					<Link
						className={`btn btn-secondary btn-glow ${styles.secondaryBtn}`}
						to="/docs/overview"
					>
						Read Documentation
					</Link>
				</div>
			</div>
		</section>
	);
}

export default function Home(): ReactNode {
	return (
		<Layout
			title="Scriptmonkey - Minimal UserScript Manager for Chrome"
			description="Lightweight Manifest V3 Chrome extension for managing and editing user scripts locally with zero tracking."
		>
			<HeroHeader />
			<main>
				<FeatureGrid />
				<UseCasesShowcase />
				<HowItWorks />
				<BottomCTA />
			</main>
		</Layout>
	);
}
