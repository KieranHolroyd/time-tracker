<script lang="ts">
	import { enhance } from '$app/forms';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StampIcon from '@lucide/svelte/icons/stamp';
	import CreateProfileDialog from '$lib/components/create-profile-dialog.svelte';
	import ProfileAvatar from '$lib/components/profile-avatar.svelte';
	import type { SessionUser } from '$lib/auth/claims';
	import type { Profile } from '$lib/types';

	type Props = {
		/** Ledgers from before sign-in existed, none of them owned by an account yet. */
		profiles: Profile[];
		user: SessionUser;
		createErrorMessage?: string;
		claimErrorMessage?: string;
	};

	let { profiles, user, createErrorMessage, claimErrorMessage }: Props = $props();
	let createOpen = $state(false);

	const firstName = $derived(user.name.split(/\s+/)[0]);

	function tileDelay(index: number) {
		return `--enter-delay: ${(0.1 + index * 0.05).toFixed(2)}s`;
	}
</script>

<div class="profile-screen">
	<div class="profile-screen__inner">
		<span class="profile-screen__eyebrow tile-enter" style="--enter-delay: 0s">
			<StampIcon />
			Hourmark
		</span>

		<h1 class="profile-screen__title tile-enter" style="--enter-delay: 0.04s">
			Welcome, {firstName}
		</h1>
		<p class="profile-screen__subtitle tile-enter" style="--enter-delay: 0.08s">
			Pick up a ledger that&apos;s already here, or start a fresh one. It becomes yours — you
			won&apos;t be asked again.
		</p>

		<div class="profile-grid" role="list">
			{#each profiles as profile, i (profile.id)}
				<div class="profile-grid__item tile-enter" role="listitem" style={tileDelay(i)}>
					<form method="POST" action="?/claimProfile" use:enhance>
						<input type="hidden" name="profileId" value={profile.id} />
						<button type="submit" class="profile-card" aria-label={`Claim ${profile.name}'s ledger`}>
							<ProfileAvatar {profile} size="tile" />
							<span class="profile-card__name">{profile.name}</span>
						</button>
					</form>
				</div>
			{/each}

			<div class="profile-grid__item tile-enter" role="listitem" style={tileDelay(profiles.length)}>
				<button
					type="button"
					class="profile-card profile-card--add"
					onclick={() => (createOpen = true)}
				>
					<span class="profile-card__add-icon">
						<PlusIcon />
					</span>
					<span class="profile-card__name">Start fresh</span>
				</button>
			</div>
		</div>

		{#if (createErrorMessage || claimErrorMessage) && !createOpen}
			<p class="profile-screen__error tile-enter">{claimErrorMessage ?? createErrorMessage}</p>
		{/if}
	</div>
</div>

<CreateProfileDialog bind:open={createOpen} errorMessage={createErrorMessage} name={user.name} />
