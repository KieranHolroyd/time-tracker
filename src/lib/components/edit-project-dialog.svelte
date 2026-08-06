<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { PROJECT_COLORS } from '$lib/constants';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { ProjectWithStats } from '$lib/types';

	type Props = {
		open?: boolean;
		project?: ProjectWithStats | null;
		errorMessage?: string;
	};

	let { open = $bindable(false), project = null, errorMessage }: Props = $props();

	let submitting = $state(false);
	let name = $state('');
	let color = $state<string>(PROJECT_COLORS[0]);

	$effect(() => {
		if (open && project) {
			name = project.name;
			color = project.color;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Edit project</Dialog.Title>
			<Dialog.Description>Update the name and colour for this project.</Dialog.Description>
		</Dialog.Header>

		{#if project}
			<form
				method="POST"
				action="?/updateProject"
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
				<input type="hidden" name="id" value={project.id} />
				<input type="hidden" name="color" value={color} />

				<div class="grid gap-1.5">
					<Label for="edit-project-name">Project name</Label>
					<Input
						id="edit-project-name"
						name="name"
						bind:value={name}
						required
						class="h-9"
					/>
				</div>

				<fieldset class="grid gap-2">
					<legend class="text-sm font-medium">Colour</legend>
					<div class="flex flex-wrap gap-2">
						{#each PROJECT_COLORS as swatch (swatch)}
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
