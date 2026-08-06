export const fadeUp = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -4 }
};

export const fadeUpSubtle = {
	initial: { opacity: 0, y: 5 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -3 }
};

export const fadeIn = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 }
};

export const scaleIn = {
	initial: { opacity: 0, scale: 0.97 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.98 }
};

export const slideIn = {
	initial: { opacity: 0, x: -6 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: 4 }
};

export const slideInRight = {
	initial: { opacity: 0, x: 6 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: -4 }
};

export const cardEnter = {
	initial: { opacity: 0, y: 6, scale: 0.99 },
	animate: { opacity: 1, y: 0, scale: 1 },
	exit: { opacity: 0, y: -4, scale: 0.99 }
};

export const listItem = {
	initial: { opacity: 0, x: -4 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: 4 }
};

/** Softer spring — good default for UI micro-interactions */
export const spring = { type: 'spring' as const, stiffness: 380, damping: 28 };

/** Even softer — profile cards, large surfaces */
export const springSoft = { type: 'spring' as const, stiffness: 320, damping: 26 };

export const smooth = { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };

export const smoothFast = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };

export const hoverSubtle = { y: -1, scale: 1.01 };
export const tapSubtle = { scale: 0.98, y: 0 };

export const hoverLift = { y: -2, scale: 1.015 };
export const tapPress = { scale: 0.97, y: 0 };

export function stagger(index: number, step = 0.035) {
	return index * step;
}

export const stampPulse = {
	scale: [1, 0.96, 1.04, 1] as const,
	transition: { duration: 0.42, ease: 'easeOut' as const }
};
