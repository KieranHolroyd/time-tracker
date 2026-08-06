<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import { stampPulse, smooth, hoverLift, tapPress } from '$lib/motion';

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

<motion.div
	class="inline-flex"
	initial={false}
	animate={pulse ? { scale: [...stampPulse.scale] } : { opacity: 1, scale: 1 }}
	transition={pulse ? stampPulse.transition : smooth}
	whileHover={disabled ? undefined : hoverLift}
	whileTap={disabled ? undefined : tapPress}
>
	<button
		{type}
		{disabled}
		style={`--stamp-size: ${size}px`}
		class={cn('hour-stamp', className)}
		aria-label="Add one hour"
		{...restProps}
	>
		<span class="hour-stamp__ring" aria-hidden="true"></span>
		<span class="hour-stamp__hours">{hoursLabel}</span>
		<span class="hour-stamp__label">Add hour</span>
	</button>
</motion.div>
