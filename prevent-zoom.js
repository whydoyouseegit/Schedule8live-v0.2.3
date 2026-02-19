(function() {
    // Предотвращение масштабирования через Ctrl/Cmd + колесико мыши
    document.addEventListener('wheel', function(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // Предотвращение масштабирования через клавиатуру (Ctrl/Cmd + +, -, 0)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_' || e.key === '0') {
                e.preventDefault();
            }
        }
        if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // Предотвращение масштабирования через жест pinch-to-zoom на тачпаде
    let lastTouchDistance = 0;
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (lastTouchDistance && Math.abs(distance - lastTouchDistance) > 10) {
                e.preventDefault();
            }
            lastTouchDistance = distance;
        }
    }, { passive: false });

    document.addEventListener('touchend', function() {
        lastTouchDistance = 0;
    });

    // Принудительное восстановление масштаба
    function resetZoom() {
        if (window.innerWidth !== 1280) {
            document.body.style.zoom = '1';
            const meta = document.querySelector('meta[name=viewport]');
            if (meta) {
                meta.setAttribute('content', 'width=1280, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, shrink-to-fit=no');
            }
        }
    }

    setInterval(resetZoom, 1000);
    window.addEventListener('resize', resetZoom);
    
    // Дополнительная защита от изменения масштаба
    window.addEventListener('load', resetZoom);
    document.addEventListener('DOMContentLoaded', resetZoom);
})();