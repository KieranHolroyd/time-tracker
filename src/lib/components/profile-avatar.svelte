<script lang="ts">
	import type { Profile } from '$lib/types';

	type Props = {
		profile: Profile;
		size?: 'sm' | 'md' | 'lg' | 'xl';
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
			lg: 'size-24 text-3xl',
			xl: 'size-28 text-4xl'
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
