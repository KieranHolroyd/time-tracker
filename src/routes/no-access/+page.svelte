<script lang="ts">
	import StampIcon from '@lucide/svelte/icons/stamp';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>No access · Hourmark</title>
</svelte:head>

<div class="profile-screen">
	<div class="profile-screen__inner">
		<span class="profile-screen__eyebrow tile-enter" style="--enter-delay: 0s">
			<StampIcon />
			Hourmark
		</span>

		<h1 class="profile-screen__title tile-enter" style="--enter-delay: 0.04s">
			You&apos;re signed in, but not let in
		</h1>
		<p class="profile-screen__subtitle tile-enter" style="--enter-delay: 0.08s">
			{data.user.name}, your Holroyd ID account doesn&apos;t hold access to Hourmark. Ask an
			administrator to grant it, then reload — new access shows up within ten minutes.
		</p>

		<div class="auth-actions tile-enter" style="--enter-delay: 0.12s">
			<Button href="/no-access" data-sveltekit-reload>Check again</Button>
			<form method="POST" action="/auth/logout">
				<Button type="submit" variant="outline">Sign out</Button>
			</form>
		</div>
	</div>
</div>
