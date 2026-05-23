(function() {
    const motions = window.vimBridge.registries.motionsFind;
    const VimDOM = window.vimBridge.VimDOM;

    // ==========================================
    // UTILITY: Line Boundaries
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
    // CORE FIND EXECUTION
    // ==========================================
    function executeFind(i, map, motion, target) {
        if (!target) return i;
        
        let end = getLineEnd(i, map);
        let start = getLineStart(i, map);

        if (motion === 'f') {
            for (let curr = i + 1; curr <= end; curr++) {
                if (map[curr].char === target) return curr;
            }
        } else if (motion === 'F') {
            for (let curr = i - 1; curr >= start; curr--) {
                if (map[curr].char === target) return curr;
            }
        } else if (motion === 't') {
            for (let curr = i + 1; curr <= end; curr++) {
                if (map[curr].char === target) return curr - 1;
            }
        } else if (motion === 'T') {
            for (let curr = i - 1; curr >= start; curr--) {
                if (map[curr].char === target) return curr + 1;
            }
        }
        
        return i; // Return original position if character is not found on this line
    }

    // ==========================================
    // REGISTRY BINDINGS
    // ==========================================
    
    // Primary Finders
    motions['f'] = VimDOM.applyMotion((i, map, cmd) => {
        if (cmd.target) window.vimBridge.memory.lastFindMotion = { motion: 'f', target: cmd.target };
        return executeFind(i, map, 'f', cmd.target);
    });

    motions['F'] = VimDOM.applyMotion((i, map, cmd) => {
        if (cmd.target) window.vimBridge.memory.lastFindMotion = { motion: 'F', target: cmd.target };
        return executeFind(i, map, 'F', cmd.target);
    });

    motions['t'] = VimDOM.applyMotion((i, map, cmd) => {
        if (cmd.target) window.vimBridge.memory.lastFindMotion = { motion: 't', target: cmd.target };
        return executeFind(i, map, 't', cmd.target);
    });

    motions['T'] = VimDOM.applyMotion((i, map, cmd) => {
        if (cmd.target) window.vimBridge.memory.lastFindMotion = { motion: 'T', target: cmd.target };
        return executeFind(i, map, 'T', cmd.target);
    });

    // Repeaters (; and ,)
    motions[';'] = VimDOM.applyMotion((i, map) => {
        let last = window.vimBridge.memory.lastFindMotion;
        if (!last) return i;
        return executeFind(i, map, last.motion, last.target);
    });

    motions[','] = VimDOM.applyMotion((i, map) => {
        let last = window.vimBridge.memory.lastFindMotion;
        if (!last) return i;
        
        // Invert the motion direction for the comma command
        let invertedMotion = { 'f': 'F', 'F': 'f', 't': 'T', 'T': 't' }[last.motion];
        return executeFind(i, map, invertedMotion, last.target);
    });

})();
