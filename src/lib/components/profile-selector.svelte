<script lang="ts">
	import { enhance } from '$app/forms';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StampIcon from '@lucide/svelte/icons/stamp';
	import CreateProfileDialog from '$lib/components/create-profile-dialog.svelte';
	import EditProfileDialog from '$lib/components/edit-profile-dialog.svelte';
	import ProfileAvatar from '$lib/components/profile-avatar.svelte';
	import type { Profile } from '$lib/types';

	type Props = {
		profiles: Profile[];
		createErrorMessage?: string;
		editErrorMessage?: string;
	};

	let { profiles, createErrorMessage, editErrorMessage }: Props = $props();
	let createOpen = $state(false);
	let editOpen = $state(false);
	let editingProfile = $state<Profile | null>(null);

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
			Who&apos;s tracking?
		</h1>
		<p class="profile-screen__subtitle tile-enter" style="--enter-delay: 0.08s">
			Choose a profile to open your time ledger.
		</p>

		<div class="profile-grid" role="list">
			{#each profiles as profile, i (profile.id)}
				<div class="profile-grid__item tile-enter" role="listitem" style={tileDelay(i)}>
					<form method="POST" action="?/selectProfile" use:enhance>
						<input type="hidden" name="profileId" value={profile.id} />
						<button
							type="submit"
							class="profile-card"
							aria-label={`Open ${profile.name}'s ledger`}
						>
							<ProfileAvatar {profile} size="tile" />
							<span class="profile-card__name">{profile.name}</span>
						</button>
					</form>

					<button
						type="button"
						class="profile-card__edit"
						aria-label={`Edit ${profile.name}`}
						onclick={() => {
							editingProfile = profile;
							editOpen = true;
						}}
					>
						<PencilIcon />
					</button>
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
					<span class="profile-card__name">Add profile</span>
				</button>
			</div>
		</div>

		{#if createErrorMessage && !createOpen && !editOpen}
			<p class="profile-screen__error tile-enter">{createErrorMessage}</p>
		{/if}
	</div>
</div>

<CreateProfileDialog bind:open={createOpen} errorMessage={createErrorMessage} />
<EditProfileDialog bind:open={editOpen} profile={editingProfile} errorMessage={editErrorMessage} />
