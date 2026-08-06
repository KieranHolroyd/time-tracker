<script lang="ts">
	import { enhance } from '$app/forms';
	import { AnimatePresence, motion } from '@humanspeak/svelte-motion';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StampIcon from '@lucide/svelte/icons/stamp';
	import CreateProfileDialog from '$lib/components/create-profile-dialog.svelte';
	import ProfileAvatar from '$lib/components/profile-avatar.svelte';
	import { fadeUpSubtle, scaleIn, smooth, springSoft, stagger, tapPress } from '$lib/motion';
	import type { Profile } from '$lib/types';

	type Props = {
		profiles: Profile[];
		errorMessage?: string;
	};

	let { profiles, errorMessage }: Props = $props();
	let createOpen = $state(false);
	let hoveredId = $state<number | null>(null);
	let addHovered = $state(false);
</script>

<div class="profile-screen">
	<motion.div class="profile-screen__inner" {...fadeUpSubtle} transition={smooth}>
		<motion.span
			class="profile-screen__eyebrow"
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={smooth}
		>
			<StampIcon class="size-3" />
			Hourmark
		</motion.span>

		<motion.h1
			class="profile-screen__title"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ ...smooth, delay: 0.04 }}
		>
			Who&apos;s tracking?
		</motion.h1>
		<motion.p
			class="profile-screen__subtitle"
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ ...smooth, delay: 0.08 }}
		>
			Choose a profile to open your time ledger.
		</motion.p>

		<div class="profile-grid" role="list">
			{#each profiles as profile, i (profile.id)}
				<motion.div
					key={profile.id}
					class="profile-grid__item"
					role="listitem"
					{...scaleIn}
					transition={{ ...springSoft, delay: stagger(i, 0.05) + 0.1 }}
					onmouseenter={() => (hoveredId = profile.id)}
					onmouseleave={() => (hoveredId = null)}
				>
					<form method="POST" action="?/selectProfile" use:enhance>
						<input type="hidden" name="profileId" value={profile.id} />
						<motion.button
							type="submit"
							class="profile-card"
							aria-label={`Open ${profile.name}'s ledger`}
							whileTap={tapPress}
						>
							<motion.div
								class="profile-card__avatar-wrap"
								animate={{
									scale: hoveredId === profile.id ? 1.06 : 1,
									y: hoveredId === profile.id ? -5 : 0
								}}
								transition={springSoft}
							>
								<ProfileAvatar {profile} size="xl" />
							</motion.div>
							<motion.span
								class="profile-card__name"
								animate={{
									opacity: hoveredId === profile.id ? 1 : 0.72,
									y: hoveredId === profile.id ? 0 : 1
								}}
								transition={smooth}
							>
								{profile.name}
							</motion.span>
						</motion.button>
					</form>
				</motion.div>
			{/each}

			<motion.div
				class="profile-grid__item"
				role="listitem"
				{...scaleIn}
				transition={{ ...springSoft, delay: stagger(profiles.length, 0.05) + 0.1 }}
				onmouseenter={() => (addHovered = true)}
				onmouseleave={() => (addHovered = false)}
			>
				<motion.button
					type="button"
					class="profile-card profile-card--add"
					onclick={() => (createOpen = true)}
					whileTap={tapPress}
				>
					<motion.span
						class="profile-card__add-icon"
						animate={{
							scale: addHovered ? 1.04 : 1,
							borderColor: addHovered
								? 'oklch(0.8 0.14 80 / 55%)'
								: 'oklch(0.93 0.02 85 / 22%)'
						}}
						transition={springSoft}
					>
						<PlusIcon />
					</motion.span>
					<motion.span
						class="profile-card__name"
						animate={{ opacity: addHovered ? 1 : 0.72 }}
						transition={smooth}
					>
						Add profile
					</motion.span>
				</motion.button>
			</motion.div>
		</div>

		<AnimatePresence initial={false}>
			{#if errorMessage}
				<motion.p
					class="profile-screen__error"
					initial={{ opacity: 0, y: -4 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -4 }}
					transition={smooth}
				>
					{errorMessage}
				</motion.p>
			{/if}
		</AnimatePresence>
	</motion.div>
</div>

<CreateProfileDialog bind:open={createOpen} {errorMessage} />
