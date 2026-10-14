import { useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        // A clean navigation means the bundle is healthy — reset the
        // stale-chunk retry budget so the next rebuild can self-heal again.
        try { sessionStorage.removeItem('tb:chunk-retries'); } catch { /* ignore */ }
    }, [pathname]);

    return null;
}

export default ScrollToTop;