<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ProfileAvatar from '$lib/components/profile-avatar.svelte';
	import { PROFILE_COLORS } from '$lib/constants';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { Profile } from '$lib/types';

	type Props = {
		open?: boolean;
		profile?: Profile | null;
		errorMessage?: string;
	};

	let { open = $bindable(false), profile = null, errorMessage }: Props = $props();

	let submitting = $state(false);
	let name = $state('');
	let color = $state<string>(PROFILE_COLORS[0]);

	$effect(() => {
		if (open && profile) {
			name = profile.name;
			color = profile.color;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Edit profile</Dialog.Title>
			<Dialog.Description>Update the name and colour for this profile.</Dialog.Description>
		</Dialog.Header>

		{#if profile}
			<form
				method="POST"
				action="?/updateProfile"
				class="grid gap-4"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						submitting = false;
						if (result.type === 'success') {
							open = false;
							await invalidateAll();
							return;
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={profile.id} />
				<input type="hidden" name="color" value={color} />

				<div class="flex justify-center">
					<ProfileAvatar profile={{ ...profile, color }} size="lg" />
				</div>

				<div class="grid gap-1.5">
					<Label for="edit-profile-name">Name</Label>
					<Input
						id="edit-profile-name"
						name="name"
						bind:value={name}
						required
						class="h-9"
					/>
				</div>

				<fieldset class="grid gap-2">
					<legend class="text-sm font-medium">Colour</legend>
					<div class="flex flex-wrap gap-2">
						{#each PROFILE_COLORS as swatch (swatch)}
							<button
								type="button"
								class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-[ring-color] {color ===
								swatch
									? 'ring-foreground'
									: 'ring-transparent hover:ring-muted-foreground/40'}"
								style:background={swatch}
								aria-label="Select colour {swatch}"
								aria-pressed={color === swatch}
								onclick={() => (color = swatch)}
							></button>
						{/each}
					</div>
				</fieldset>

				{#if errorMessage}
					<p class="m-0 text-sm text-destructive">{errorMessage}</p>
				{/if}

				<Dialog.Footer class="gap-2 sm:gap-0">
					<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
					<Button type="submit" disabled={submitting || !name.trim()}>
						{submitting ? 'Saving…' : 'Save changes'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
