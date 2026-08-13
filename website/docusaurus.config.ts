import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
	title: "Scriptmonkey Docs",
	tagline: "Documentation for Scriptmonkey",
	favicon: "img/favicon.ico",

	url: "https://matwoess.github.io",
	baseUrl: "/scriptmonkey/",

	organizationName: "matwoess",
	projectName: "scriptmonkey",
	trailingSlash: false,
	staticDirectories: ["static", "../assets/docs"],

	onBrokenLinks: "throw",

	markdown: {
		mermaid: true,
	},
	themes: ["@docusaurus/theme-mermaid"],

	stylesheets: [
		"https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap",
	],

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		navbar: {
			title: "Scriptmonkey",
			items: [
				{
					type: "docSidebar",
					sidebarId: "tutorialSidebar",
					position: "left",
					label: "Docs",
				},
				{
					to: "/privacy-policy",
					label: "Privacy Policy",
					position: "left",
				},
				{
					href: "https://github.com/matwoess/scriptmonkey",
					label: "GitHub",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Docs",
					items: [
						{
							label: "Overview",
							to: "/docs/overview",
						},
						{
							label: "Features",
							to: "/docs/features",
						},
						{
							label: "Metadata Support",
							to: "/docs/metadata-support",
						},
						{
							label: "Technical Architecture",
							to: "/docs/architecture",
						},
						{
							label: "Development Guide",
							to: "/docs/development",
						},
						{
							label: "Planned Features",
							to: "/docs/planned-features",
						},
					],
				},
				{
					title: "Legal",
					items: [
						{
							label: "Privacy Policy",
							to: "/privacy-policy",
						},
						{
							label: "License (Apache-2.0)",
							href: "https://github.com/matwoess/scriptmonkey/blob/main/LICENSE",
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} Scriptmonkey. Built with Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
