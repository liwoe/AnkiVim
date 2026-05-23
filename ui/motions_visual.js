// TODO: Implement visual mode logic like c, x, d...

(function() {
    window.vimBridge = window.vimBridge || {};
    window.vimBridge.registries.motionsVisual = window.vimBridge.registries.motionsVisual || {};
    
    const VimDOM = window.vimBridge.VimDOM;

    window.vimBridge.registries.motionsVisual.execute = function(cmd, baseRegistryName) {
        const { root, sel } = VimDOM.getSelectionInfo();
        if (!sel || !root) return;

        const map = VimDOM.buildCharMap(root);
        if (map.length === 0) return;

        let currentIndex = window.vimBridge.memory.visualFocus;
        if (currentIndex === undefined || currentIndex === null) {
            currentIndex = VimDOM.getCurrentIndex(map, sel);
        }

        const motionRegistry = window.vimBridge.registries[baseRegistryName];
        if (!motionRegistry || !motionRegistry[cmd.motion]) return;

        const baseMotionWrapped = motionRegistry[cmd.motion];
        
        let targetIndex = currentIndex;
        const originalSetCursor = VimDOM.setCursor;
        
        VimDOM.setCursor = function(map, idx) { targetIndex = idx; };
        baseMotionWrapped(cmd); 
        VimDOM.setCursor = originalSetCursor; 

        // Update our strict internal memory
        window.vimBridge.memory.visualFocus = targetIndex;
        let anchorIndex = window.vimBridge.memory.visualAnchor;

        this.setVisualSelection(map, anchorIndex, targetIndex, sel);
    };

    window.vimBridge.registries.motionsVisual.setVisualSelection = function(map, anchorIdx, focusIdx, sel) {
        if (anchorIdx < 0) anchorIdx = 0;
        if (focusIdx >= map.length) focusIdx = map.length - 1;

        function getDOMPoint(mapEntry, isAfter) {
            if (!mapEntry) return { node: document.body, offset: 0 };
            
            if (mapEntry.type === 'text') {
                return { node: mapEntry.node, offset: mapEntry.offset + (isAfter ? 1 : 0) };
            } else if (mapEntry.type === 'eof') {
                if (mapEntry.node.nodeType === Node.TEXT_NODE) {
                    return { node: mapEntry.node, offset: mapEntry.node.textContent.length };
                } else {
                    return { node: mapEntry.node, offset: mapEntry.node.childNodes.length };
                }
            } else {
                let parent = mapEntry.node.parentNode || mapEntry.node;
                let idx = Array.prototype.indexOf.call(parent.childNodes, mapEntry.node);
                if (idx === -1) idx = 0;
                return { node: parent, offset: idx + (isAfter ? 1 : 0) };
            }
        }

        let isForward = focusIdx >= anchorIdx;
        let anchorDOM = getDOMPoint(map[anchorIdx], !isForward);
        let focusDOM = getDOMPoint(map[focusIdx], isForward);

        try {
            sel.setBaseAndExtent(anchorDOM.node, anchorDOM.offset, focusDOM.node, focusDOM.offset);
        } catch (e) {
            console.warn("VimBridge: Failed to set visual range", e);
        }
    };
})();
