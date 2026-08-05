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
					<img
						src="icon.svg"
						width="72"
						height="72"
						alt="Scriptmonkey Logo"
						className={styles.heroLogo}
					/>
				</div>

				<div className={styles.badgePill}>
					<span className={styles.badgeDot} />
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
						className={styles.primaryBtn}
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

					<Link className={styles.secondaryBtn} to="/docs/intro">
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
						className={styles.secondaryBtn}
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
				<div className={styles.windowControls}>
					<span className={`${styles.controlDot} ${styles.dotRed}`} />
					<span className={`${styles.controlDot} ${styles.dotYellow}`} />
					<span className={`${styles.controlDot} ${styles.dotGreen}`} />
				</div>
				<div className={styles.mockupTitle}>
					Scriptmonkey Dashboard - dark-theme.user.js
				</div>
				<div className={styles.mockupBadge}>Active</div>
			</div>

			<div className={styles.mockupBody}>
				<div className={styles.mockupSidebar}>
					<div className={styles.sidebarHeading}>Installed Scripts</div>
					<div className={`${styles.scriptItem} ${styles.scriptItemActive}`}>
						<span>Dark Theme Enforcer</span>
						<span className={styles.statusIndicator} />
					</div>
					<div className={styles.scriptItem}>
						<span>GitHub Clean Feed</span>
						<span className={styles.statusIndicator} />
					</div>
					<div className={styles.scriptItem}>
						<span>YouTube Auto HD</span>
						<span className={styles.statusIndicator} />
					</div>
					<div className={styles.scriptItem}>
						<span>No-Ads Bypass</span>
						<span className={styles.statusIndicator} />
					</div>
				</div>

				<div className={styles.mockupContent}>
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
							Metadata Rules
						</button>
					</div>

					{activeTab === "editor" ? (
						<pre className={styles.codeSnippet}>
							<code>
								<span className={styles.cm}>{"// ==UserScript=="}</span>
								{"\n"}
								<span className={styles.cm}>
									{"// @name Dark Theme Enforcer"}
								</span>
								{"\n"}
								<span className={styles.cm}>{"// @version 1.2.0"}</span>
								{"\n"}
								<span className={styles.cm}>
									{"// @match https://*.example.com/*"}
								</span>
								{"\n"}
								<span className={styles.cm}>{"// @grant none"}</span>
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
									`body &#123; background: #121212 !important; color: #e0e0e0
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
					) : (
						<div className={styles.metadataContainer}>
							<div className={styles.metadataCard}>
								<span className={styles.metadataKey}>@name:</span>{" "}
								<span className={styles.str}>"Dark Theme Enforcer"</span>
							</div>
							<div className={styles.metadataCard}>
								<span className={styles.metadataKey}>@match:</span>{" "}
								<span className={styles.str}>"https://*.example.com/*"</span>
							</div>
							<div className={styles.metadataCard}>
								<span className={styles.metadataKey}>@version:</span>{" "}
								<span className={styles.kw}>1.2.0</span>
							</div>
							<div className={styles.metadataCard}>
								<span className={styles.metadataKey}>Execution Target:</span>{" "}
								<span className={styles.str}>"Chrome MV3 userScripts API"</span>
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
					<polyline points="16 18 22 12 16 6" />
					<polyline points="8 6 2 12 8 18" />
				</svg>
			),
			title: "CodeMirror 6 Editor",
			desc: "Full-featured code editor with syntax highlighting, line numbers, error diagnostics, and Ctrl+S quick save.",
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
			title: "Parsed Metadata Cards",
			desc: "View automatically parsed @name, @match, @include, @exclude, and @version rules organized into clean collapsible cards.",
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
			desc: "Instant popup menu to toggle scripts on active pages + full-screen dashboard for searching and editing your library.",
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
			desc: "Compares script version tags against remote @updateURL or @downloadURL feeds with manual or bulk update actions.",
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
			desc: "Import existing .user.js or .js files instantly by dragging them into the dashboard or extension popup.",
		},
	];

	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<span className={styles.sectionTag}>Features</span>
				<Heading as="h2" className={styles.sectionTitle}>
					Everything You Need, Nothing You Don't
				</Heading>
				<p className={styles.sectionSubtitle}>
					Designed for users and developers who want a modern, performant, and
					privacy-respecting script manager.
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

function CodeShowcase() {
	const [copied, setCopied] = useState(false);

	const sampleScript = (
		<>
			<span className={styles.cm}>{"// ==UserScript=="}</span>
			{"\n"}
			<span className={styles.cm}>{"// @name GitHub Enhancer"}</span>
			{"\n"}
			<span className={styles.cm}>{"// @match https://github.com/*"}</span>
			{"\n"}
			<span className={styles.cm}>
				{
					"// @description Adds quick navigation shortcuts and custom dark styling"
				}
			</span>
			{"\n"}
			<span className={styles.cm}>{"// @version 1.0.0"}</span>
			{"\n"}
			<span className={styles.cm}>{"// ==/UserScript=="}</span>
			{"\n\n"}(<span className={styles.kw}>function</span> () {"{\n"}
			{"  "}
			<span className={styles.str}>'use strict'</span>;{"\n"}
			{"  "}console.<span className={styles.fn}>log</span>(
			<span className={styles.str}>
				'[Scriptmonkey] GitHub script running on'
			</span>
			, window.location.href);{"\n"}
			{"}"})();
		</>
	);

	const rawScript = `// ==UserScript==
// @name         GitHub Enhancer
// @match        https://github.com/*
// @description  Adds quick navigation shortcuts and custom dark styling
// @version      1.0.0
// ==/UserScript==

(function () {
  'use strict';
  console.log('[Scriptmonkey] GitHub script running on', window.location.href);
})();`;

	const copyCode = () => {
		navigator.clipboard.writeText(rawScript);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<span className={styles.sectionTag}>Compatibility</span>
				<Heading as="h2" className={styles.sectionTitle}>
					Standard UserScript Format
				</Heading>
				<p className={styles.sectionSubtitle}>
					Works seamlessly with your existing scripts. Full support for standard
					metadata headers and rule matching.
				</p>
			</div>

			<div className={styles.showcaseBox}>
				<div className={styles.showcaseHeader}>
					<span className={styles.showcaseFilename}>sample-script.user.js</span>
					<button
						type="button"
						className={`${styles.tabBtn} ${styles.copyBtn}`}
						onClick={copyCode}
					>
						{copied ? "Copied!" : "Copy Code"}
					</button>
				</div>

				<pre className={styles.codeSnippet}>
					<code>{sampleScript}</code>
				</pre>
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
			desc: 'Click "Add Script" in the dashboard or drop your .user.js files directly into the window.',
		},
		{
			num: "3",
			title: "Automate & Enjoy",
			desc: "Scripts run automatically on matching web pages with instant reload and zero overhead.",
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
						<div className={styles.stepNumber}>{step.num}</div>
						<h3 className={styles.stepTitle}>{step.title}</h3>
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
					Ready to take control of your web scripts?
				</Heading>
				<p className={styles.bottomCtaDesc}>
					Install Scriptmonkey today and experience a clean, modern user script
					manager for Chrome.
				</p>
				<div className={styles.bottomCtaButtons}>
					<a
						className={styles.primaryBtn}
						href="https://chromewebstore.google.com/detail/scriptmonkey-beta/afmgkdanppbobipehgpfcmhpgeoejcpn"
						target="_blank"
						rel="noopener noreferrer"
					>
						Install Extension
					</a>
					<Link className={styles.secondaryBtn} to="/docs/intro">
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
				<CodeShowcase />
				<HowItWorks />
				<BottomCTA />
			</main>
		</Layout>
	);
}
