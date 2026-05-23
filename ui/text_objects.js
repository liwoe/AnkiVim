(function() {
    window.vimBridge.registries.textObjects = {};
    const textObjects = window.vimBridge.registries.textObjects;
    const VimDOM = window.vimBridge.VimDOM;

    function getPairBounds(i, map, leftChar, rightChar, isInner) {
        // TODO: currently this only works inside a bracket.
        // FIX: Should search the next bracket and return the index of start and end.
        let left = i;
        let right = i;
        let depth = 0;

        while (left >= 0) {
            if (map[left].char === rightChar) depth++;
            else if (map[left].char === leftChar) {
                if (depth === 0) break;
                depth--;
            }
            left--;
        }
        if (left < 0) return null; // Unmatched

        depth = 0;
        while (right < map.length) {
            if (map[right].char === leftChar) depth++;
            else if (map[right].char === rightChar) {
                if (depth === 0) break;
                depth--;
            }
            right++;
        }
        if (right >= map.length) return null; // Unmatched

        if (isInner) {
            return [left + 1, right]; // Exclude the brackets themselves
        } else {
            return [left, right + 1]; // Include the brackets
        }
    }

    // w, W (Words)
    function getWordBounds(i, map, isInner, isBig) {
        let left = i;
        let right = i;
        
        let startType = VimDOM.getCharType(map[i].char, isBig);
        
        // Scan left to start of word
        while (left > 0 && VimDOM.getCharType(map[left - 1].char, isBig) === startType && map[left - 1].char !== '\n') left--;
        
        // Scan right to end of word
        while (right < map.length - 1 && VimDOM.getCharType(map[right].char, isBig) === startType && map[right].char !== '\n') right++;

        if (isInner) {
            return [left, right];
        } else {
            // 'aw' includes the trailing spaces
            while (right < map.length - 1 && VimDOM.getCharType(map[right].char, isBig) === 'space' && map[right].char !== '\n') right++;
            return [left, right];
        }
    }

    // Map the commands
    textObjects['w'] = (i, map, isInner) => getWordBounds(i, map, isInner, false);
    textObjects['W'] = (i, map, isInner) => getWordBounds(i, map, isInner, true);
    
    // Alias routing for blocks
    textObjects['b'] = textObjects['('] = textObjects[')'] = (i, map, isInner) => getPairBounds(i, map, '(', ')', isInner);
    textObjects['B'] = textObjects['{'] = textObjects['}'] = (i, map, isInner) => getPairBounds(i, map, '{', '}', isInner);
    textObjects['t'] = textObjects['<'] = textObjects['>'] = (i, map, isInner) => getPairBounds(i, map, '<', '>', isInner);
    textObjects['['] = textObjects[']'] = (i, map, isInner) => getPairBounds(i, map, '[', ']', isInner);
})();
