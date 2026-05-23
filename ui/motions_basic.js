(function() {
    // Hook into the new Dispatcher-ready registry
    const motions = window.vimBridge.registries.motionsBasic;
    const VimDOM = window.vimBridge.VimDOM; 

    // ==========================================
    // UTILITY: Line Boundary Helpers
    // ==========================================
    function getLineStart(i, map) {
        let curr = i;
        while (curr > 0 && map[curr - 1].char !== '\n') curr--;
        return curr;
    }

    function getLineEnd(i, map) {
        let curr = i;
        while (curr < map.length - 1 && map[curr].char !== '\n' && map[curr].char !== 'EOF') curr++;
        return curr;
    }

    // ==========================================
    // 1. HORIZONTAL MOTIONS 
    // ==========================================
    motions['l'] = VimDOM.applyMotion((i, map) => {
        if (i < map.length - 1 && map[i].char !== '\n' && map[i].char !== 'EOF') return i + 1;
        return i;
    });

    motions['h'] = VimDOM.applyMotion((i, map) => {
        if (i > 0 && map[i - 1].char !== '\n') return i - 1;
        return i;
    });

    // ==========================================
    // 2. LINE BOUNDARY MOTIONS
    // ==========================================
    motions['0'] = VimDOM.applyMotion((i, map) => getLineStart(i, map));
    
    motions['$'] = VimDOM.applyMotion((i, map) => getLineEnd(i, map));

    // NEW: ^ (Jump to first non-blank character of the line)
    motions['^'] = VimDOM.applyMotion((i, map) => {
        let curr = getLineStart(i, map);
        while (curr < map.length - 1 && map[curr].char !== '\n' && map[curr].char !== 'EOF' && (map[curr].char === ' ' || map[curr].char === '\t')) {
            curr++;
        }
        return curr;
    });

    // NEW: g_ (Jump to last non-blank character of the line)
    motions['g_'] = VimDOM.applyMotion((i, map) => {
        let end = getLineEnd(i, map);
        let curr = end;
        if (curr > 0 && (map[curr].char === '\n' || map[curr].char === 'EOF')) curr--; // Step back from the void
        while (curr > 0 && map[curr - 1].char !== '\n' && (map[curr].char === ' ' || map[curr].char === '\t')) {
            curr--;
        }
        return curr;
    });

    // ==========================================
    // 3. VERTICAL MOTIONS (Now with Column Memory)
    // ==========================================
    motions['j'] = VimDOM.applyMotion((i, map) => {
        let currentLineStart = getLineStart(i, map);
        
        // 1. Memorize column if we don't have one saved
        if (window.vimBridge.memory.desiredColumn === null) {
            window.vimBridge.memory.desiredColumn = i - currentLineStart;
        }
        let targetCol = window.vimBridge.memory.desiredColumn;
        
        let currentLineEnd = getLineEnd(i, map);
        if (currentLineEnd >= map.length - 1 || map[currentLineEnd].char === 'EOF') return i; 
        
        let nextLineStart = currentLineEnd;
        if (map[nextLineStart].char === '\n') nextLineStart++; 
        
        let nextLineEnd = getLineEnd(nextLineStart, map);
        
        // 2. Apply memorized column, safely bounding it to the new line's length
        return Math.min(nextLineStart + targetCol, nextLineEnd);
    });

    motions['k'] = VimDOM.applyMotion((i, map) => {
        let currentLineStart = getLineStart(i, map);
        
        // 1. Memorize column if we don't have one saved
        if (window.vimBridge.memory.desiredColumn === null) {
            window.vimBridge.memory.desiredColumn = i - currentLineStart;
        }
        let targetCol = window.vimBridge.memory.desiredColumn;
        
        if (currentLineStart === 0) return i; 
        
        let prevLineStart = getLineStart(currentLineStart - 1, map);
        let prevLineEnd = getLineEnd(prevLineStart, map);
        
        // 2. Apply memorized column, safely bounding it to the prev line's length
        return Math.min(prevLineStart + targetCol, prevLineEnd);
    });

    // Fallbacks for display lines (for now, treating same as physical lines)
    motions['gj'] = motions['j'];
    motions['gk'] = motions['k'];

    // ==========================================
    // 4. DOCUMENT BOUNDARY MOTIONS
    // ==========================================
    motions['gg'] = VimDOM.applyMotion((i, map) => {
        let curr = 0;
        // Vim behavior: gg usually jumps to the first non-blank character of the first line
        while (curr < map.length - 1 && map[curr].char !== '\n' && map[curr].char !== 'EOF' && (map[curr].char === ' ' || map[curr].char === '\t')) {
            curr++;
        }
        return curr;
    });

    motions['G'] = VimDOM.applyMotion((i, map) => {
        if (map.length === 0) return 0;
        let curr = map.length - 1;
        if (map[curr].char === 'EOF') curr--; 
        return getLineEnd(curr, map); // Standard Vim G drops you at the start of the last line
    });

})();
