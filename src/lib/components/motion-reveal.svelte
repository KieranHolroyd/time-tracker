<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';
	import type { Snippet } from 'svelte';
	import { fadeUpSubtle, hoverSubtle, smooth, stagger, tapSubtle } from '$lib/motion';

	type Props = {
		class?: string;
		delay?: number;
		index?: number;
		hover?: boolean;
		layout?: boolean;
		as?: 'div' | 'section' | 'li' | 'span' | 'p';
		children: Snippet;
	};

	let {
		class: className = '',
		delay,
		index,
		hover = false,
		layout = false,
		as = 'div',
		children
	}: Props = $props();

	const resolvedDelay = $derived(delay ?? (index == null ? 0 : stagger(index)));
	const motionProps = $derived({
		...fadeUpSubtle,
		transition: { ...smooth, delay: resolvedDelay },
		layout,
		whileHover: hover ? hoverSubtle : undefined,
		whileTap: hover ? tapSubtle : undefined
	});
</script>

{#if as === 'section'}
	<motion.section class={className} {...motionProps}>{@render children()}</motion.section>
{:else if as === 'li'}
	<motion.li class={className} {...motionProps}>{@render children()}</motion.li>
{:else if as === 'span'}
	<motion.span class={className} {...motionProps}>{@render children()}</motion.span>
{:else if as === 'p'}
	<motion.p class={className} {...motionProps}>{@render children()}</motion.p>
{:else}
	<motion.div class={className} {...motionProps}>{@render children()}</motion.div>
{/if}
