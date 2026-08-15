<script lang="ts">
	import StampIcon from '@lucide/svelte/icons/stamp';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<svelte:head>
	<title>Signed out · Hourmark</title>
</svelte:head>

<div class="profile-screen">
	<div class="profile-screen__inner">
		<span class="profile-screen__eyebrow tile-enter" style="--enter-delay: 0s">
			<StampIcon />
			Hourmark
		</span>

		<h1 class="profile-screen__title tile-enter" style="--enter-delay: 0.04s">
			You&apos;re signed out
		</h1>
		<p class="profile-screen__subtitle tile-enter" style="--enter-delay: 0.08s">
			Hourmark has forgotten this session. Your Holroyd ID session is still open, so signing back in
			takes one click — sign out there too if you&apos;re on a shared machine.
		</p>

		<div class="auth-actions tile-enter" style="--enter-delay: 0.12s">
			<Button href="/auth/login" data-sveltekit-reload>Sign in again</Button>
		</div>
	</div>
</div>
