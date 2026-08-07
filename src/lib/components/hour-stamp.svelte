<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type Props = HTMLButtonAttributes & {
		pulse?: boolean;
		hoursLabel?: string;
		size?: number;
	};

	let {
		pulse = false,
		hoursLabel = '+1',
		size = 132,
		class: className,
		disabled,
		type = 'submit',
		...restProps
	}: Props = $props();
</script>

<div class="inline-flex shrink-0">
	<button
		{type}
		{disabled}
		style={`--stamp-size: ${size}px`}
		class={cn('hour-stamp', pulse && 'hour-stamp--stamped', className)}
		aria-label="Add one hour"
		{...restProps}
	>
		<span class="hour-stamp__ring" aria-hidden="true"></span>
		<span class="hour-stamp__hours">{hoursLabel}</span>
		<span class="hour-stamp__label">Add hour</span>
		<span class="hour-stamp__shock" aria-hidden="true"></span>
	</button>
</div>
