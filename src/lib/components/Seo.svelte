<script lang="ts">
	import { page } from '$app/state';
	import { serializeJsonLd, SITE_NAME, SOCIAL_IMAGE_PATH } from '$lib/seo';

	let {
		title,
		description,
		canonicalPath = page.url.pathname,
		imagePath = SOCIAL_IMAGE_PATH,
		imageAlt = 'KoalaData shareable Chrome Web Store analytics',
		type = 'website',
		noindex = false,
		schemas = []
	}: {
		title: string;
		description: string;
		canonicalPath?: string;
		imagePath?: string;
		imageAlt?: string;
		type?: 'website' | 'article';
		noindex?: boolean;
		schemas?: Record<string, unknown>[];
	} = $props();

	let canonicalUrl = $derived(new URL(canonicalPath, page.url.origin).href);
	let imageUrl = $derived(new URL(imagePath, page.url.origin).href);
	let robots = $derived(noindex
		? 'noindex, nofollow'
		: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
	let serializedSchemas = $derived(schemas.map(serializeJsonLd));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="en" href={canonicalUrl} />
	<link rel="alternate" hreflang="x-default" href={canonicalUrl} />

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:secure_url" content={imageUrl} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={imageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
	<meta name="twitter:image:alt" content={imageAlt} />

	{#each serializedSchemas as schema}
		{@html `<script type="application/ld+json">${schema}</script>`}
	{/each}
</svelte:head>
