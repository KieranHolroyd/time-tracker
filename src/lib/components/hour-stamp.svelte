<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import { smooth } from '$lib/motion';

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

	const pulseKeyframes = { scale: [1, 0.92, 1.06, 1] };
</script>

<motion.div
	class="inline-flex"
	initial={false}
	animate={pulse ? pulseKeyframes : { opacity: 1, scale: 1 }}
	transition={pulse ? { duration: 0.45, ease: 'easeOut' } : smooth}
	whileHover={disabled ? undefined : { scale: 1.03, y: -2 }}
	whileTap={disabled ? undefined : { scale: 0.96, y: 1 }}
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
