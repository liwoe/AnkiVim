(function() {
    window.vimBridge.registries.actions = window.vimBridge.registries.actions || {};
    const actions = window.vimBridge.registries.actions;
    const VimDOM = window.vimBridge.VimDOM;

    function withVimContext(actionFn) {
        return (cmd) => {
            const { root, sel } = VimDOM.getSelectionInfo();
            if (!sel || !root) return;
            const map = VimDOM.buildCharMap(root);
            if (map.length === 0) return;
            let i = VimDOM.getCurrentIndex(map, sel);
            actionFn(cmd, { root, sel, map, i });
        };
    }

    // ==========================================
    // INSERT MODE TRIGGERS
    // ==========================================
    actions['i'] = () => {}; // Mode switch handled by Python

    actions['a'] = withVimContext((cmd, { root, map, i, sel }) => {
        if (i < map.length - 1 && map[i].char !== '\n' && map[i].char !== 'EOF') {
            i++;
            if (map[i].char === '\n' || map[i].char === 'EOF') {
                let prev = map[i - 1];
                if (prev && prev.type === 'text') {
                    let range = document.createRange();
                    range.setStart(prev.node, prev.offset + 1);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return;
                }
            }
        }
        VimDOM.setCursor(map, i, sel);
    });

    actions['A'] = withVimContext((cmd, { root, map, i, sel }) => {
        while (i < map.length - 1 && map[i].char !== '\n' && map[i].char !== 'EOF') i++;
        if (i > 0 && (map[i].char === '\n' || map[i].char === 'EOF')) {
            let prev = map[i - 1];
            if (prev && prev.type === 'text') {
                let range = document.createRange();
                range.setStart(prev.node, prev.offset + 1);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
        }
        VimDOM.setCursor(map, i, sel);
    });

    actions['I'] = withVimContext((cmd, { map, i, sel }) => {
        while (i > 0 && map[i-1].char !== '\n') i--;
        while (i < map.length - 1 && (map[i].char === ' ' || map[i].char === '\t')) i++;
        VimDOM.setCursor(map, i, sel);
    });

    actions['ea'] = (cmd) => {
        window.vimBridge.registries.motionsWord['e'](cmd);
        actions['a'](cmd);
    };

    // ==========================================
    // OPEN LINE (o, O) - FIXED DOM PHYSICS
    // ==========================================
    actions['o'] = withVimContext((cmd, { root, sel, map, i }) => {
        // Move to end of current line
        while (i < map.length - 1 && map[i].char !== '\n' && map[i].char !== 'EOF') i++;
        VimDOM.setCursor(map, i, sel);
        // insertLineBreak simulates standard Enter natively, creating a clean block break
        document.execCommand('insertLineBreak', false, null); 
    });

    actions['O'] = withVimContext((cmd, { root, sel, map, i }) => {
        while (i > 0 && map[i - 1].char !== '\n') i--;
        VimDOM.setCursor(map, i, sel);
        
        document.execCommand('insertLineBreak', false, null);
        
        const newMap = VimDOM.buildCharMap(root);

        let newI = VimDOM.getCurrentIndex(newMap, sel);
        if (newI > 0) VimDOM.setCursor(newMap, newI - 1, sel);
    });

    // ==========================================
    // DELETION & CHANGE MACROS (x, r, ~)
    // ==========================================
    actions['x'] = withVimContext((cmd, { root, sel, map, i }) => {
        if (map[i].char === '\n' || map[i].char === 'EOF') return;
        let range = document.createRange();
        range.setStart(map[i].node, map[i].offset);
        range.setEnd(map[i].node, map[i].offset + 1);
        sel.removeAllRanges(); sel.addRange(range);
        document.execCommand('delete', false, null);
        const newMap = VimDOM.buildCharMap(root);
        VimDOM.setCursor(newMap, VimDOM.preventNewlineLanding(i, newMap), sel);
    });

    actions['r'] = withVimContext((cmd, { root, sel, map, i }) => {
        if (!cmd.target || map[i].char === '\n' || map[i].char === 'EOF') return;
        let range = document.createRange();
        range.setStart(map[i].node, map[i].offset);
        range.setEnd(map[i].node, map[i].offset + 1);
        sel.removeAllRanges(); sel.addRange(range);
        document.execCommand('insertText', false, cmd.target);
        const newMap = VimDOM.buildCharMap(root);
        VimDOM.setCursor(newMap, i, sel);
    });

    actions['~'] = withVimContext((cmd, { root, sel, map, i }) => {
        let char = map[i].char;
        if (!char || char === '\n' || char === 'EOF') return;
        let newChar = char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase();
        
        let range = document.createRange();
        range.setStart(map[i].node, map[i].offset);
        range.setEnd(map[i].node, map[i].offset + 1);
        sel.removeAllRanges(); sel.addRange(range);
        document.execCommand('insertText', false, newChar);
        
        const newMap = VimDOM.buildCharMap(root);
        VimDOM.setCursor(newMap, VimDOM.preventNewlineLanding(i + 1, newMap), sel);
    });

    // ==========================================
    // LINE JOINING (J, gJ)
    // ==========================================
    actions['J'] = withVimContext((cmd, { root, sel, map, i }) => {
        while (i < map.length - 1 && map[i].char !== '\n') i++;
        if (i >= map.length - 1 || map[i].char !== '\n') return; // Last line
        
        let range = document.createRange();
        range.setStart(map[i].node, map[i].offset);
        range.setEnd(map[i+1].node, map[i+1].type === 'text' ? map[i+1].offset : 0);
        
        sel.removeAllRanges(); sel.addRange(range);
        document.execCommand('insertText', false, cmd.action === 'J' ? ' ' : '');
    });
    actions['gJ'] = actions['J'];

    // ==========================================
    // MULTI-KEY MACROS (C, D, s, S)
    // ==========================================
    actions['D'] = (cmd) => { cmd.operator = 'd'; cmd.motion = '$'; window.vimBridge.Dispatcher.executeOperatorWithMotion(cmd); };
    actions['C'] = (cmd) => { cmd.operator = 'c'; cmd.motion = '$'; window.vimBridge.Dispatcher.executeOperatorWithMotion(cmd); };
    actions['s'] = (cmd) => { cmd.operator = 'c'; cmd.motion = 'l'; window.vimBridge.Dispatcher.executeOperatorWithMotion(cmd); };
    actions['S'] = (cmd) => { cmd.operator = 'c'; cmd.motion = 'c'; window.vimBridge.Dispatcher.executeOperatorWithMotion(cmd); };

    // ==========================================
    // PASTE PLACEHOLDERS
    // ==========================================
    actions['p'] = (cmd) => { console.log(`[VimBridge] Requesting paste after`); };
    actions['P'] = (cmd) => { console.log(`[VimBridge] Requesting paste before`); };
})();
