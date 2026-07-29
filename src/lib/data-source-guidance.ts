export interface ImportGuidance {
	title: string;
	description: string;
	url: string;
	linkLabel: string;
	note: string;
}

function chromeExtensionId(url: string | null | undefined): string | null {
	const match = url?.match(/[a-p]{32}/i);
	return match ? match[0] : null;
}

function firefoxStatisticsUrl(url: string | null | undefined): string {
	if (url) {
		try {
			const parsed = new URL(url);
			if (parsed.hostname.toLowerCase() === 'addons.mozilla.org') {
				const slug = parsed.pathname.match(/\/firefox\/addon\/([^/]+)/i)?.[1];
				if (slug) {
					return `https://addons.mozilla.org/en-US/firefox/addon/${encodeURIComponent(decodeURIComponent(slug))}/statistics/`;
				}
			}
		} catch {
			// The source editor validates URLs; use the general developer page as fallback.
		}
	}
	return 'https://addons.mozilla.org/developers/addons';
}

export function getImportGuidance(
	sourceType: string,
	externalUrl: string | null | undefined
): ImportGuidance | null {
	if (sourceType === 'chrome_web_store') {
		const extensionId = chromeExtensionId(externalUrl);
		return {
			title: 'Chrome Web Store',
			description: 'Open the statistics dashboard and export the reports you want to publish.',
			url: extensionId
				? `https://chrome.google.com/u/1/webstore/devconsole/e2f2b549-b9e3-48c2-b562-d5b16058d995/${extensionId}/analytics/installs?hl=en`
				: 'https://chrome.google.com/webstore/devconsole',
			linkLabel: 'Open CWS Stats Dashboard',
			note: 'Automatic detection supports known CWS reports and localized headers. Unknown files open mapping review.'
		};
	}
	if (sourceType === 'firefox_amo') {
		return {
			title: 'Firefox Add-ons (AMO)',
			description: 'Open your add-on statistics and export the Downloads or Daily Users report as CSV.',
			url: firefoxStatisticsUrl(externalUrl),
			linkLabel: 'Open AMO Statistics',
			note: 'Official downloads-day and usage-day exports are detected and imported automatically.'
		};
	}
	if (sourceType === 'edge_add_ons') {
		return {
			title: 'Microsoft Edge Add-ons',
			description: 'Open Partner Center, select the extension, then choose Extension overview > Analytics and export the report as CSV.',
			url: 'https://partner.microsoft.com/dashboard/microsoftedge/overview',
			linkLabel: 'Open Edge Partner Center',
			note: 'Edge CSV files open mapping review until their exported columns are confirmed.'
		};
	}
	return null;
}
