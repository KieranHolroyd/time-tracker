<script lang="ts">
	import type { Profile } from '$lib/types';

	type Props = {
		profile: Profile;
		/** `tile` defers sizing to the surrounding grid's `--profile-tile`. */
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'tile';
		class?: string;
	};

	let { profile, size = 'md', class: className = '' }: Props = $props();

	const initials = $derived(
		profile.name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	const sizeClass = $derived(
		{
			sm: 'profile-avatar--sm size-6 text-[0.65rem]',
			md: 'size-16 text-xl',
			lg: 'size-20 text-2xl sm:size-24 sm:text-3xl',
			xl: 'size-20 text-3xl sm:size-28 sm:text-4xl',
			tile: 'profile-avatar--tile'
		}[size]
	);
</script>

<div
	class="profile-avatar {sizeClass} {className}"
	style:--avatar-color={profile.color}
	aria-hidden="true"
>
	<span class="profile-avatar__initials">{initials}</span>
</div>
