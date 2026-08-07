<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { SUPPORTED_CURRENCIES } from '$lib/constants';
	import {
		billableAmount,
		hasBillableRate,
		projectedWeekHours,
		weekProgress
	} from '$lib/earnings';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { formatDuration, formatMoney } from '$lib/format';
	import type { ProfileSettings, Summary } from '$lib/types';

	type Props = {
		open?: boolean;
		settings: ProfileSettings;
		summary: Summary;
		overall: Summary;
		today: string;
		errorMessage?: string;
	};

	let {
		open = $bindable(false),
		settings,
		summary,
		overall,
		today,
		errorMessage
	}: Props = $props();

	let submitting = $state(false);
	let hourlyRate = $state('');
	let currency = $state<string>('GBP');
	let weeklyHoursGoal = $state('');

	$effect(() => {
		if (open) {
			hourlyRate = settings.hourly_rate != null ? String(settings.hourly_rate) : '';
			currency = settings.currency;
			weeklyHoursGoal =
				settings.weekly_hours_goal != null ? String(settings.weekly_hours_goal) : '';
		}
	});

	const previewRate = $derived(Number(hourlyRate) > 0 ? Number(hourlyRate) : null);
	const previewCurrency = $derived(currency);
	const previewWeekEarnings = $derived(billableAmount(overall.week, previewRate));
	const previewTodayEarnings = $derived(billableAmount(summary.today, previewRate));
	const previewProgress = $derived(
		weekProgress(
			overall.week,
			weeklyHoursGoal.trim() ? Number(weeklyHoursGoal) : null
		)
	);
	const previewProjectedWeek = $derived(
		previewRate ? projectedWeekHours(overall.week, today) : null
	);
	const previewProjectedEarnings = $derived(
		billableAmount(previewProjectedWeek ?? 0, previewRate)
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Settings</Dialog.Title>
			<Dialog.Description>
				Set your hourly rate and goals — Hourmark will calculate earnings automatically.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/updateSettings"
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
			<div class="grid gap-1.5">
				<Label for="settings-hourly-rate">Hourly rate</Label>
				<Input
					id="settings-hourly-rate"
					name="hourlyRate"
					type="number"
					min="0"
					step="0.01"
					placeholder="e.g. 75"
					bind:value={hourlyRate}
					class="h-9"
				/>
				<p class="m-0 text-xs text-muted-foreground">
					Leave blank to hide earnings calculations.
				</p>
			</div>

			<div class="grid gap-1.5">
				<Label for="settings-currency">Currency</Label>
				<Select.Root type="single" bind:value={currency}>
					<Select.Trigger id="settings-currency" class="h-9 w-full">
						{currency}
					</Select.Trigger>
					<Select.Content>
						{#each SUPPORTED_CURRENCIES as code (code)}
							<Select.Item value={code}>{code}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="currency" value={currency} />
			</div>

			<div class="grid gap-1.5">
				<Label for="settings-weekly-goal">Weekly hours goal</Label>
				<Input
					id="settings-weekly-goal"
					name="weeklyHoursGoal"
					type="number"
					min="0.25"
					step="0.25"
					placeholder="e.g. 40"
					bind:value={weeklyHoursGoal}
					class="h-9"
				/>
				<p class="m-0 text-xs text-muted-foreground">
					Optional — track progress toward your target each week.
				</p>
			</div>

			{#if previewRate}
				<div class="settings-preview panel grid gap-2 p-3">
					<p class="settings-preview__title">Current view</p>
					<div class="settings-preview__row">
						<span>Today</span>
						<span>
							{formatDuration(summary.today)}
							{#if previewTodayEarnings != null}
								· {formatMoney(previewTodayEarnings, previewCurrency)}
							{/if}
						</span>
					</div>
					<div class="settings-preview__row">
						<span>This week</span>
						<span>
							{formatDuration(overall.week)}
							{#if previewWeekEarnings != null}
								· {formatMoney(previewWeekEarnings, previewCurrency)}
							{/if}
						</span>
					</div>
					{#if previewProjectedWeek && previewProjectedEarnings != null}
						<div class="settings-preview__row settings-preview__row--muted">
							<span>Projected week</span>
							<span>
								{formatDuration(previewProjectedWeek)}
								· {formatMoney(previewProjectedEarnings, previewCurrency)}
							</span>
						</div>
					{/if}
					{#if previewProgress}
						<div class="settings-preview__progress">
							<div class="settings-preview__progress-label">
								<span>{Math.round(previewProgress.percent)}% of weekly goal</span>
								<span>{formatDuration(previewProgress.remaining)} left</span>
							</div>
							<div class="settings-preview__progress-track">
								<div
									class="settings-preview__progress-fill"
									style={`width: ${previewProgress.percent}%`}
								></div>
							</div>
						</div>
					{/if}
				</div>
			{:else if hasBillableRate(settings)}
				<p class="m-0 text-xs text-muted-foreground">
					Clear the hourly rate to hide earnings across the app.
				</p>
			{/if}

			{#if errorMessage}
				<p class="m-0 text-sm text-destructive">{errorMessage}</p>
			{/if}

			<Dialog.Footer class="gap-2 sm:gap-0">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save settings'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
