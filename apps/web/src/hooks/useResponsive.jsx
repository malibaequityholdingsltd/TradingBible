import { useEffect, useMemo, useState } from 'react';

function getWidth() {
    if (typeof window === 'undefined') return 1280;
    return window.innerWidth;
}

export function useResponsive() {
    const [width, setWidth] = useState(getWidth);

    useEffect(() => {
        let raf = 0;
        const onResize = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => setWidth(window.innerWidth));
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(raf);
        };
    }, []);

    return useMemo(() => {
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        const isDesktop = width >= 1024;
        const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        return {
            width,
            isMobile,
            isTablet,
            isDesktop,
            isTouch,
            screen: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        };
    }, [width]);
}

export default useResponsive;
