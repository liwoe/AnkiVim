(function() {
    window.vimBridge.registries.operators = window.vimBridge.registries.operators || {};
    const operators = window.vimBridge.registries.operators;
    const VimDOM = window.vimBridge.VimDOM;

    window.vimBridge.sendYankToPython = function(register, htmlContent, isLineWise) {
        // TODO: Implement the registers in python.
        // pycmd(`vim_yank:${register}:${isLineWise ? 'line' : 'char'}:${htmlContent}`);
    };

    function selectAndExtractRange(map, startIdx, endIdx, sel) {
        if (startIdx === endIdx) return null;
        let isForward = endIdx >= startIdx;
        let actualStart = Math.max(0, isForward ? startIdx : endIdx);
        let actualEnd = Math.min(map.length - 1, isForward ? endIdx : startIdx);

        let range = document.createRange();
        range.setStart(map[actualStart].node, map[actualStart].offset);
        
        if (map[actualEnd].type === 'eof' && map[actualEnd].node.nodeType !== Node.TEXT_NODE) {
            range.setEnd(map[actualEnd].node, map[actualEnd].node.childNodes.length);
        } else {
            range.setEnd(map[actualEnd].node, map[actualEnd].offset);
        }

        sel.removeAllRanges();
        sel.addRange(range);

        let div = document.createElement('div');
        div.appendChild(range.cloneContents());
        return div.innerHTML;
    }

    // Core Operators
    operators['d'] = (cmd, map, startIdx, endIdx, sel) => {
        let extractedHTML = selectAndExtractRange(map, startIdx, endIdx, sel);
        if (extractedHTML === null) return;
        window.vimBridge.sendYankToPython(cmd.register || '"', extractedHTML, cmd.motion === cmd.operator);
        document.execCommand('delete', false, null);
        const newMap = VimDOM.buildCharMap(VimDOM.getSelectionInfo().root);
        VimDOM.setCursor(newMap, VimDOM.preventNewlineLanding(Math.min(startIdx, endIdx), newMap), sel);
    };

    operators['c'] = (cmd, map, startIdx, endIdx, sel) => {
        let extractedHTML = selectAndExtractRange(map, startIdx, endIdx, sel);
        if (extractedHTML === null) return;
        window.vimBridge.sendYankToPython(cmd.register || '"', extractedHTML, cmd.motion === cmd.operator);
        document.execCommand('delete', false, null);
        const newMap = VimDOM.buildCharMap(VimDOM.getSelectionInfo().root);
        VimDOM.setCursor(newMap, Math.min(startIdx, endIdx), sel);
    };

    operators['y'] = (cmd, map, startIdx, endIdx, sel) => {
        let extractedHTML = selectAndExtractRange(map, startIdx, endIdx, sel);
        if (extractedHTML === null) return;
        window.vimBridge.sendYankToPython(cmd.register || '"', extractedHTML, cmd.motion === cmd.operator);
        sel.collapseToStart();
        VimDOM.setCursor(map, Math.min(startIdx, endIdx), sel);
    };

    // Case Modifiers (gu, gU)
    function changeCase(cmd, map, startIdx, endIdx, sel, toUpper) {
        if (!selectAndExtractRange(map, startIdx, endIdx, sel)) return;
        let text = window.getSelection().toString();
        document.execCommand('insertText', false, toUpper ? text.toUpperCase() : text.toLowerCase());
        const newMap = VimDOM.buildCharMap(VimDOM.getSelectionInfo().root);
        VimDOM.setCursor(newMap, Math.min(startIdx, endIdx), sel);
    }

    operators['gu'] = (cmd, map, startIdx, endIdx, sel) => changeCase(cmd, map, startIdx, endIdx, sel, false);
    operators['gU'] = (cmd, map, startIdx, endIdx, sel) => changeCase(cmd, map, startIdx, endIdx, sel, true);

    // Indentation (Just 4 spaces as requested)
    operators['>'] = (cmd, map, startIdx, endIdx, sel) => {
        let lineStart = startIdx;
        while (lineStart > 0 && map[lineStart - 1].char !== '\n') lineStart--;
        VimDOM.setCursor(map, lineStart, sel);
        document.execCommand('insertText', false, '    ');
    };

    operators['<'] = (cmd, map, startIdx, endIdx, sel) => {
        let lineStart = startIdx;
        while (lineStart > 0 && map[lineStart - 1].char !== '\n') lineStart--;
        
        let spaceCount = 0;
        while (spaceCount < 4 && map[lineStart + spaceCount].char === ' ') spaceCount++;
        
        if (spaceCount > 0) {
            let range = document.createRange();
            range.setStart(map[lineStart].node, map[lineStart].offset);
            range.setEnd(map[lineStart + spaceCount - 1].node, map[lineStart + spaceCount - 1].offset + 1);
            sel.removeAllRanges(); sel.addRange(range);
            document.execCommand('delete', false, null);
        }
    };
})();
