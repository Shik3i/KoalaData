export const CHROME_HEADER_ALIASES = {
	date: [
		'date', 'time', 'date_utc', 'timestamp', 'day', 'datum', 'datum des berichts', 'tag',
		'date du rapport', 'fecha', 'data', 'giorno', 'datum rapport', 'data raportu', 'tarih',
		'日付', '날짜', '日期'
	],
	active_users: [
		'weekly active users', 'weekly users', 'active users', 'users', 'active_users', 'weekly_active_users',
		'nutzer pro woche', 'wochentlich aktive nutzer', 'wochentliche nutzer insgesamt',
		'utilisateurs hebdomadaires', 'utilisateurs actifs par semaine',
		'usuarios semanales', 'usuarios activos semanales',
		'usuarios semanais', 'utenti settimanali', 'wekelijkse gebruikers', 'użytkownicy tygodniowi', 'uzytkownicy tygodniowi',
		'haftalık kullanıcılar', 'haftalik kullanicilar', '週単位のユーザー', '주간 사용자', '每周用户'
	],
	installs: [
		'daily installs', 'installs', 'daily_installs', 'downloads', 'download_count',
		'installationen', 'tagliche installationen', 'installations quotidiennes',
		'instalaciones diarias', 'instalacoes diarias', 'installazioni giornaliere',
		'dagelijkse installaties', 'dzienne instalacje', 'günlük yüklemeler', 'gunluk yuklemeler', '1 日のインストール数',
		'일일 설치', '每日安装次数'
	],
	uninstalls: [
		'daily uninstalls', 'uninstalls', 'daily_uninstalls', 'deinstallationen', 'tagliche deinstallationen',
		'desinstallations quotidiennes', 'desinstalaciones diarias', 'desinstalacoes diarias',
		'disinstallazioni giornaliere', 'dagelijkse verwijderingen', 'dzienne odinstalowania',
		'günlük kaldırmalar', 'gunluk kaldirmalar', '1 日のアンインストール数', '일일 제거', '每日卸载次数'
	],
	store_page_views: [
		'store page views', 'page views', 'pageviews', 'store_views', 'store_page_views',
		'seitenaufrufe', 'store-seitenaufrufe', 'seitenaufrufe im gesamten store', 'seitenaufrufe nach quelle', 'vues de la page de la boutique',
		'vistas de la pagina de la tienda', 'visualizacoes da pagina da loja',
		'visualizzazioni pagina dello store', 'winkelpaginaweergaven', 'wyswietlenia strony sklepu',
		'mağaza sayfası görüntülemeleri', 'magaza sayfasi goruntulemeleri', 'ストア掲載情報のページビュー', '스토어 페이지 조회수', '商店页面浏览量'
	],
	store_impressions: [
		'impressions', 'store impressions', 'store_impressions', 'impressionen', 'store-impressionen',
		'impressionen im gesamten store', 'impressions de la boutique', 'impresiones de la tienda', 'impressoes da loja',
		'impressioni dello store', 'winkelvertoningen', 'wyswietlenia w sklepie',
		'mağaza gösterimleri', 'magaza gosterimleri', 'ストアの表示回数', '스토어 노출수', '商店展示次数'
	]
} as const;

const locales = {
	de: {
		installs: 'installationen', uninstalls: 'deinstallationen', users: 'wochentliche nutzer',
		by: 'nach',
		region: 'region', language: 'sprache', os: 'betriebssystem', version: 'erweiterungsversion',
		enabled: 'aktiviert im vergleich zu deaktiviert', ratings: 'bewertungen im zeitverlauf'
	},
	en: {
		installs: 'installs', uninstalls: 'uninstalls', users: 'weekly users', region: 'region',
		by: 'by',
		language: 'language', os: 'operating system', version: 'item version',
		enabled: 'enabled versus disabled', ratings: 'ratings over time'
	},
	fr: {
		installs: 'installations', uninstalls: 'desinstallations', users: 'utilisateurs hebdomadaires',
		by: 'par',
		region: 'region', language: 'langue', os: 'systeme d exploitation', version: 'version de l extension',
		enabled: 'activees et desactivees', ratings: 'notes au fil du temps'
	},
	es: {
		installs: 'instalaciones', uninstalls: 'desinstalaciones', users: 'usuarios semanales',
		by: 'por',
		region: 'region', language: 'idioma', os: 'sistema operativo', version: 'version de la extension',
		enabled: 'habilitadas frente a inhabilitadas', ratings: 'valoraciones a lo largo del tiempo'
	},
	pt: {
		installs: 'instalacoes', uninstalls: 'desinstalacoes', users: 'usuarios semanais',
		by: 'por',
		region: 'regiao', language: 'idioma', os: 'sistema operacional', version: 'versao da extensao',
		enabled: 'ativadas e desativadas', ratings: 'avaliacoes ao longo do tempo'
	},
	it: {
		installs: 'installazioni', uninstalls: 'disinstallazioni', users: 'utenti settimanali',
		by: 'per',
		region: 'regione', language: 'lingua', os: 'sistema operativo', version: 'versione dell estensione',
		enabled: 'attivate e disattivate', ratings: 'valutazioni nel tempo'
	},
	nl: {
		installs: 'installaties', uninstalls: 'verwijderingen', users: 'wekelijkse gebruikers',
		by: 'op',
		region: 'regio', language: 'taal', os: 'besturingssysteem', version: 'extensieversie',
		enabled: 'ingeschakeld versus uitgeschakeld', ratings: 'beoordelingen in de loop van de tijd'
	},
	pl: {
		installs: 'instalacje', uninstalls: 'odinstalowania', users: 'użytkownicy tygodniowi',
		by: 'według',
		region: 'region', language: 'język', os: 'system operacyjny', version: 'wersja rozszerzenia',
		enabled: 'włączone i wyłączone', ratings: 'oceny w czasie'
	},
	tr: {
		installs: 'yüklemeler', uninstalls: 'kaldırmalar', users: 'haftalık kullanıcılar',
		by: 'göre',
		region: 'bölge', language: 'dil', os: 'işletim sistemi', version: 'uzantı sürümü',
		enabled: 'etkin ve devre dışı', ratings: 'zaman içindeki puanlar'
	}
} as const;

const byDimension = (metric: 'installs' | 'uninstalls' | 'users', dimension: 'region' | 'language' | 'os') =>
	Object.values(locales).map((locale) => `${locale[metric]} ${locale.by} ${locale[dimension]}`);

export const CHROME_REPORT_PATTERNS = [
	{ patterns: [...byDimension('installs', 'region'), 'installs by country'], report: { id: 'installs-region', title: 'Installs by Region', dimensionKey: 'region', semantics: 'flow', section: 'acquisition', unitLabel: 'installs' } },
	{ patterns: byDimension('installs', 'language'), report: { id: 'installs-language', title: 'Installs by Language', dimensionKey: 'language', semantics: 'flow', section: 'acquisition', unitLabel: 'installs' } },
	{ patterns: [...byDimension('installs', 'os'), 'installs by os'], report: { id: 'installs-os', title: 'Installs by Operating System', dimensionKey: 'operating_system', semantics: 'flow', section: 'acquisition', unitLabel: 'installs' } },
	{ patterns: [...byDimension('uninstalls', 'region'), 'uninstalls by country'], report: { id: 'uninstalls-region', title: 'Uninstalls by Region', dimensionKey: 'region', semantics: 'flow', section: 'retention', unitLabel: 'uninstalls' } },
	{ patterns: byDimension('uninstalls', 'language'), report: { id: 'uninstalls-language', title: 'Uninstalls by Language', dimensionKey: 'language', semantics: 'flow', section: 'retention', unitLabel: 'uninstalls' } },
	{ patterns: [...byDimension('uninstalls', 'os'), 'uninstalls by os'], report: { id: 'uninstalls-os', title: 'Uninstalls by Operating System', dimensionKey: 'operating_system', semantics: 'flow', section: 'retention', unitLabel: 'uninstalls' } },
	{ patterns: [...byDimension('users', 'region'), 'weekly users by country'], report: { id: 'weekly-users-region', title: 'Weekly Users by Region', dimensionKey: 'region', semantics: 'snapshot', section: 'audience', unitLabel: 'users' } },
	{ patterns: byDimension('users', 'language'), report: { id: 'weekly-users-language', title: 'Weekly Users by Language', dimensionKey: 'language', semantics: 'snapshot', section: 'audience', unitLabel: 'users' } },
	{ patterns: [...byDimension('users', 'os'), 'weekly users by os'], report: { id: 'weekly-users-os', title: 'Weekly Users by Operating System', dimensionKey: 'operating_system', semantics: 'snapshot', section: 'audience', unitLabel: 'users' } },
	{ patterns: [
		...Object.values(locales).map((locale) => `${locale.users} ${locale.by} ${locale.version}`),
		'daily users by extension version',
		'tägliche nutzer nach erweiterungsversion',
		'users by item version'
	], report: { id: 'users-version', title: 'Users by Extension Version', dimensionKey: 'version', semantics: 'snapshot', section: 'audience', unitLabel: 'users' } },
	{ patterns: [...Object.values(locales).map((locale) => locale.enabled), 'enabled vs disabled'], report: { id: 'enabled-state', title: 'Enabled vs Disabled', dimensionKey: 'state', semantics: 'snapshot', section: 'retention', unitLabel: 'installations' } },
	{ patterns: [...Object.values(locales).map((locale) => locale.ratings), 'ratings by star', 'rating distribution'], report: { id: 'ratings', title: 'Rating Distribution', dimensionKey: 'rating', semantics: 'flow', section: 'quality', unitLabel: 'ratings' } }
] as const;

export const SUPPORTED_CHROME_LOCALES = [
	'English', 'German', 'French', 'Spanish', 'Portuguese', 'Italian', 'Dutch', 'Polish', 'Turkish'
] as const;
