<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	type Props = {
		open?: boolean;
		projectId: number | null;
		projectName?: string;
		today: string;
		actionSuffix?: string;
		errorMessage?: string;
	};

	let {
		open = $bindable(false),
		projectId,
		projectName,
		today,
		actionSuffix = '',
		errorMessage
	}: Props = $props();

	let submitting = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Log time</Dialog.Title>
			<Dialog.Description>
				{#if projectName}
					Add hours to {projectName} with optional details.
				{:else}
					Choose a project in the sidebar first.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/addHour{actionSuffix}"
			class="grid gap-3"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					await update();
					if (result.type === 'success') {
						open = false;
						await invalidateAll();
					}
				};
			}}
		>
			<input type="hidden" name="projectId" value={projectId ?? ''} />

			<div class="grid grid-cols-2 gap-3">
				<div class="grid gap-1.5">
					<Label for="log-date">Date</Label>
					<Input id="log-date" type="date" name="workedOn" value={today} class="h-9" />
				</div>
				<div class="grid gap-1.5">
					<Label for="log-hours">Hours</Label>
					<Input
						id="log-hours"
						type="number"
						name="hours"
						min="0.25"
						step="0.25"
						value="1"
						class="h-9"
					/>
				</div>
			</div>

			<div class="grid gap-1.5">
				<Label for="log-comment">Comment</Label>
				<Textarea id="log-comment" name="comment" rows={2} placeholder="What did you work on?" />
			</div>

			{#if errorMessage}
				<p class="m-0 text-sm text-destructive">{errorMessage}</p>
			{/if}

			<Dialog.Footer class="gap-2 sm:gap-0">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={!projectId || submitting}>
					{submitting ? 'Logging…' : 'Log time'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
