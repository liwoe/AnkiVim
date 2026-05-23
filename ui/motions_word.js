(function() {
    const motions = window.vimBridge.registries.motionsWord;
    const VimDOM = window.vimBridge.VimDOM; 

    // ==========================================
    // WORD MOTIONS LOGIC
    // ==========================================
    
    function wordForward(i, map, isBig) {
        if (i >= map.length - 1 || map[i].char === '\n') return i;
        
        let startType = VimDOM.getCharType(map[i].char, isBig);
        
        // 1. Consume the current word/punctuation block
        if (startType !== 'space') {
            while (i < map.length - 1 && VimDOM.getCharType(map[i].char, isBig) === startType) {
                if (map[i].char === '\n') return i;
                i++;
            }
        }
        // 2. Consume trailing spaces
        while (i < map.length - 1 && VimDOM.getCharType(map[i].char, isBig) === 'space') {
            if (map[i].char === '\n') return i; 
            i++;
        }
        return i;
    }

    function wordBackward(i, map, isBig) {
        if (i === 0 || map[i-1].char === '\n') return i; 
        i--;
        
        // 1. Consume preceding spaces
        while (i > 0 && VimDOM.getCharType(map[i].char, isBig) === 'space') {
            if (map[i-1].char === '\n') return i;
            i--;
        }
        
        // 2. Consume the target word/punctuation block
        let targetType = VimDOM.getCharType(map[i].char, isBig);
        while (i > 0 && VimDOM.getCharType(map[i-1].char, isBig) === targetType && map[i-1].char !== '\n') {
            i--;
        }
        return i;
    }

    function wordEnd(i, map, isBig) {
        if (i >= map.length - 1 || map[i].char === '\n') return i;
        
        i++; // Step forward immediately
        if (map[i].char === '\n') return i - 1; 
        
        // 1. Consume any spaces we landed on
        while (i < map.length - 1 && VimDOM.getCharType(map[i].char, isBig) === 'space') {
            if (map[i].char === '\n') return (i > 0 && map[i-1].char === ' ') ? i - 1 : i; 
            i++;
        }
        
        // 2. Consume the target word until the character right before the next type change
        let targetType = VimDOM.getCharType(map[i].char, isBig);
        if (targetType !== 'space') {
            while (i < map.length - 1 && VimDOM.getCharType(map[i+1].char, isBig) === targetType) {
                if (map[i+1].char === '\n') break;
                i++;
            }
        }
        return i;
    }

    // ==========================================
    // REGISTRY BINDINGS
    // ==========================================
    motions['w'] = VimDOM.applyMotion((i, map) => wordForward(i, map, false));
    motions['W'] = VimDOM.applyMotion((i, map) => wordForward(i, map, true));
    
    motions['b'] = VimDOM.applyMotion((i, map) => wordBackward(i, map, false));
    motions['B'] = VimDOM.applyMotion((i, map) => wordBackward(i, map, true));
    
    motions['e'] = VimDOM.applyMotion((i, map) => wordEnd(i, map, false));
    motions['E'] = VimDOM.applyMotion((i, map) => wordEnd(i, map, true));

})();
