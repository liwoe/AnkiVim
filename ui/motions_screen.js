(function() {
    const motions = window.vimBridge.registries.motionsScreen;
    const VimDOM = window.vimBridge.VimDOM;

    // ==========================================
    // VIEWPORT SCROLLING (Cursor stays in place)
    // ==========================================
    function scrollNodeTo(node, position) {
        // Fallback to parent element if the current node is a raw TextNode
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (element && element.scrollIntoView) {
            element.scrollIntoView({ block: position, behavior: 'auto' });
        }
    }

    motions['zz'] = VimDOM.applyMotion((i, map) => {
        scrollNodeTo(map[i].node, 'center');
        return i; // Return exact same index, only the viewport moves
    });

    motions['zt'] = VimDOM.applyMotion((i, map) => {
        scrollNodeTo(map[i].node, 'start');
        return i;
    });

    motions['zb'] = VimDOM.applyMotion((i, map) => {
        scrollNodeTo(map[i].node, 'end');
        return i;
    });

    // ==========================================
    // VIEWPORT JUMPING (Cursor moves to screen edges)
    // ==========================================
    function findVisibleBoundary(map, targetPos) {
        const viewportTop = window.scrollY;
        const viewportBottom = window.scrollY + window.innerHeight;
        const viewportMiddle = viewportTop + (window.innerHeight / 2);

        let bestIndex = 0;
        let closestDist = Infinity;

        // Scan the map to find the character whose screen coordinates best match our target
        for (let i = 0; i < map.length; i++) {
            if (map[i].type !== 'text') continue;

            let element = map[i].node.nodeType === Node.TEXT_NODE ? map[i].node.parentElement : map[i].node;
            let rect = element.getBoundingClientRect();
            let absoluteY = rect.top + window.scrollY;

            // Only consider elements actually visible on the screen
            if (absoluteY >= viewportTop && absoluteY <= viewportBottom) {
                let dist = 0;
                if (targetPos === 'top') dist = Math.abs(absoluteY - viewportTop);
                if (targetPos === 'middle') dist = Math.abs(absoluteY - viewportMiddle);
                if (targetPos === 'bottom') dist = Math.abs(viewportBottom - absoluteY);

                if (dist < closestDist) {
                    closestDist = dist;
                    bestIndex = i;
                }
            }
        }
        return bestIndex;
    }

    // H (High): Move to the top visible line
    motions['H'] = VimDOM.applyMotion((i, map) => {
        return findVisibleBoundary(map, 'top');
    });

    // M (Middle): Move to the middle visible line
    motions['M'] = VimDOM.applyMotion((i, map) => {
        return findVisibleBoundary(map, 'middle');
    });

    // L (Low): Move to the bottom visible line
    motions['L'] = VimDOM.applyMotion((i, map) => {
        return findVisibleBoundary(map, 'bottom');
    });

    // ==========================================
    // PAGE SCROLLING
    // ==========================================
    motions['<C-d>'] = VimDOM.applyMotion((i, map) => {
        window.scrollBy(0, window.innerHeight / 2);
        return i; 
    });

    motions['<C-u>'] = VimDOM.applyMotion((i, map) => {
        window.scrollBy(0, -window.innerHeight / 2);
        return i; 
    });

    motions['<C-f>'] = VimDOM.applyMotion((i, map) => {
        window.scrollBy(0, window.innerHeight * 0.9);
        return i; 
    });

    motions['<C-b>'] = VimDOM.applyMotion((i, map) => {
        window.scrollBy(0, -window.innerHeight * 0.9);
        return i; 
    });

})();
