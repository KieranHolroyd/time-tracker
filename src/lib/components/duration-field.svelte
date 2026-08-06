<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	type Props = {
		hours?: number;
		minutes?: number;
		hoursId?: string;
		minutesId?: string;
		hoursName?: string;
		minutesName?: string;
	};

	let {
		hours = $bindable(1),
		minutes = $bindable(0),
		hoursId = 'duration-hours',
		minutesId = 'duration-minutes',
		hoursName = 'durationHours',
		minutesName = 'durationMinutes'
	}: Props = $props();
</script>

<div class="grid grid-cols-2 gap-3">
	<div class="grid gap-1.5">
		<Label for={hoursId}>Hours</Label>
		<Input
			id={hoursId}
			type="number"
			name={hoursName}
			min="0"
			step="1"
			bind:value={hours}
			class="h-9"
		/>
	</div>
	<div class="grid gap-1.5">
		<Label for={minutesId}>Minutes</Label>
		<Input
			id={minutesId}
			type="number"
			name={minutesName}
			min="0"
			max="59"
			step="1"
			bind:value={minutes}
			class="h-9"
		/>
	</div>
</div>
