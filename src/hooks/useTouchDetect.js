import { useState, useEffect } from 'react';

const MQL = '(pointer: coarse)';

function useTouchDetect() {
    const [isTouch, setIsTouch] = useState(() =>
        window.matchMedia(MQL).matches
    );

    useEffect(() => {
        const mql = window.matchMedia(MQL);
        const handler = (e) => setIsTouch(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return isTouch;
}

export default useTouchDetect;
