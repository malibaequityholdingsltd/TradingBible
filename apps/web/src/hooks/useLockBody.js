import { useEffect } from 'react';

// Body scroll lock with ref-counting: full-screen overlays (pickers,
// spotlights, guides, tours) freeze the page behind them. Multiple
// overlapping locks release safely; floating mini-widgets stay unlocked.
let locks = 0;

export function useLockBody(locked = true) {
	useEffect(() => {
		if (!locked || typeof document === 'undefined') return undefined;
		locks += 1;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			locks = Math.max(0, locks - 1);
			if (locks === 0) document.body.style.overflow = prev;
		};
	}, [locked]);
}

export default useLockBody;
