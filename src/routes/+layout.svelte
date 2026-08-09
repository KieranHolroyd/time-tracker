<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import { ensureNotificationsReady } from '$lib/notifications';

	let { children } = $props();

	onMount(() => {
		void ensureNotificationsReady();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>Hourmark</title>
</svelte:head>

{@render children()}
