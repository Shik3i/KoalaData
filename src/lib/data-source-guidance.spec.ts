import { describe, expect, it } from 'vitest';
import { getImportGuidance } from './data-source-guidance';

describe('data source import guidance', () => {
	it('builds an add-on-specific AMO statistics link', () => {
		const guidance = getImportGuidance(
			'firefox_amo',
			'https://addons.mozilla.org/de/firefox/addon/koalasync/'
		);
		expect(guidance).toMatchObject({
			title: 'Firefox Add-ons (AMO)',
			url: 'https://addons.mozilla.org/en-US/firefox/addon/koalasync/statistics/',
			linkLabel: 'Open AMO Statistics'
		});
	});

	it('uses Microsoft Partner Center for Edge and never emits a Chrome URL', () => {
		const guidance = getImportGuidance(
			'edge_add_ons',
			'https://microsoftedge.microsoft.com/addons/detail/koalasync/abcdefghijklmnopabcdefghijklmnop'
		);
		expect(guidance).toMatchObject({
			title: 'Microsoft Edge Add-ons',
			url: 'https://partner.microsoft.com/dashboard/microsoftedge/overview',
			linkLabel: 'Open Edge Partner Center'
		});
		expect(guidance?.url).not.toContain('chrome.google.com');
	});

	it('keeps Chrome analytics guidance scoped to Chrome sources', () => {
		const id = 'abcdefghijklmnopabcdefghijklmnop';
		const guidance = getImportGuidance(
			'chrome_web_store',
			`https://chromewebstore.google.com/detail/example/${id}`
		);
		expect(guidance?.url).toContain(`/analytics/installs?hl=en`);
		expect(getImportGuidance('generic_csv', null)).toBeNull();
	});
});
