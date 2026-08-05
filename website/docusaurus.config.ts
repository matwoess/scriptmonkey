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
	staticDirectories: ["static", "../public/images"],

	onBrokenLinks: "throw",

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
			logo: {
				alt: "Scriptmonkey Logo",
				src: "icon.svg",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "tutorialSidebar",
					position: "left",
					label: "Docs",
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
							label: "Intro",
							to: "/docs/intro",
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
