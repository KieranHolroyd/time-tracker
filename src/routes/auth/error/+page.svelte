<script lang="ts">
	import StampIcon from '@lucide/svelte/icons/stamp';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Sign-in failed · Hourmark</title>
</svelte:head>

<div class="profile-screen">
	<div class="profile-screen__inner">
		<span class="profile-screen__eyebrow tile-enter" style="--enter-delay: 0s">
			<StampIcon />
			Hourmark
		</span>

		<h1 class="profile-screen__title tile-enter" style="--enter-delay: 0.04s">
			Sign-in didn&apos;t finish
		</h1>
		<p class="profile-screen__subtitle tile-enter" style="--enter-delay: 0.08s">
			{data.reason}
		</p>

		<div class="auth-actions tile-enter" style="--enter-delay: 0.12s">
			<Button href="/auth/login" data-sveltekit-reload>Try again</Button>
		</div>
	</div>
</div>
