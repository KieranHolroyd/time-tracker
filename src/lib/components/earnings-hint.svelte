<script lang="ts">
	import { formatMoney } from '$lib/format';

	type Props = {
		amount: number | null;
		currency: string;
		class?: string;
	};

	let { amount, currency, class: className = '' }: Props = $props();
</script>

{#if amount != null}
	<span class="earnings-hint {className}">{formatMoney(amount, currency)}</span>
{/if}
