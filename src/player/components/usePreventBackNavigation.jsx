import { useEffect } from 'react';

function useHashPreventBackNavigation() {
    useEffect(() => {
        // 初期化時に現在のURLにハッシュを追加
        window.location.hash = "#no-back";

        const handleHashChange = () => {
            if (window.location.hash !== "#no-back") {
                window.location.hash = "#no-back";  // ハッシュが変更されたら元に戻す
            }
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);
}

export default useHashPreventBackNavigation;
