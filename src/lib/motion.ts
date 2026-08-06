export const fadeUp = {
	initial: { opacity: 0, y: 10 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -6 }
};

export const fadeIn = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 }
};

export const scaleIn = {
	initial: { opacity: 0, scale: 0.96 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.96 }
};

export const slideIn = {
	initial: { opacity: 0, x: -8 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: 8 }
};

export const spring = { type: 'spring' as const, stiffness: 420, damping: 32 };
export const smooth = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

export const stampPulse = {
	scale: [1, 0.92, 1.06, 1] as const,
	transition: { duration: 0.45, ease: 'easeOut' as const }
};
