(function() {
    window.vimBridge = window.vimBridge || {};

    const BLOCK_ELEMENTS = new Set([
        'DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3',
        'BLOCKQUOTE', 'TABLE', 'TR', 'TD', 'TH'
    ]);

    window.vimBridge.VimDOM = {
        
        getSelectionInfo: function() {
            let root = document.body;
            let sel = window.getSelection();
            
            if (document.activeElement && document.activeElement.shadowRoot) {
                const shadow = document.activeElement.shadowRoot;
                const editable = shadow.querySelector('anki-editable') || shadow.querySelector('.editable');
                if (editable) {
                    root = editable;
                    sel = shadow.getSelection();
                }
            }
            return { root, sel };
        },
        
        buildCharMap: function(root) {
            let map = [];
            
            function traverse(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    let text = node.textContent.replace(/\u00A0/g, ' '); 
                    for (let i = 0; i < text.length; i++) {
                        map.push({ char: text[i], node: node, offset: i, type: 'text' });
                    }
                } else if (node.nodeName === 'BR') {
                    map.push({ char: '\n', node: node, offset: 0, type: 'br' });
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    let isBlock = BLOCK_ELEMENTS.has(node.nodeName);
                    
                    let lastChar = map.length > 0 ? map[map.length - 1].char : null;
                    if (isBlock && lastChar !== '\n') {
                        map.push({ char: '\n', node: node, offset: 0, type: 'block' });
                    }
                    
                    for (let child of node.childNodes) traverse(child);
                    
                    lastChar = map.length > 0 ? map[map.length - 1].char : null;
                    if (isBlock && lastChar !== '\n') {
                        map.push({ char: '\n', node: node, offset: 0, type: 'block' });
                    }
                }
            }
            
            traverse(root);
            
            let lastNode = root;
            let lastOffset = 0;
            if (map.length > 0 && map[map.length - 1].type === 'text') {
                lastNode = map[map.length - 1].node;
                lastOffset = map[map.length - 1].node.textContent.length;
            }
            map.push({ char: 'EOF', node: lastNode, offset: lastOffset, type: 'eof' });
            
            return map;
        },

        getCurrentIndex: function(map, sel) {
            if (!sel || !sel.focusNode) return 0;
            let node = sel.focusNode;
            let offset = sel.focusOffset;

            while (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length > 0) {
                if (offset >= node.childNodes.length) {
                    node = node.childNodes[node.childNodes.length - 1];
                    offset = node.nodeType === Node.TEXT_NODE 
                        ? node.textContent.length 
                        : (node.childNodes ? node.childNodes.length : 1);
                } else {
                    node = node.childNodes[offset];
                    offset = 0;
                }
            }

            for (let i = 0; i < map.length; i++) {
                if (map[i].node === node && map[i].type === 'text' && map[i].offset === offset) return i;
            }
            
            if (node.nodeType === Node.TEXT_NODE && offset === node.textContent.length) {
                let lastIndex = -1;
                for (let i = 0; i < map.length; i++) {
                    if (map[i].node === node) lastIndex = i;
                }
                if (lastIndex !== -1) return Math.min(lastIndex + 1, map.length - 1);
            }

            // 3. Fallback match
            for (let i = 0; i < map.length; i++) {
                if (map[i].node === node && map[i].offset >= offset) return i;
            }
            
            return 0;
        },


        setCursor: function(map, index, sel) {
            if (index < 0) index = 0;
            if (index >= map.length) index = map.length - 1;
            let target = map[index];
            
            let range = document.createRange();
            try {
                if (target.type === 'br' || target.type === 'block') {
                    let prevSibling = target.node.previousSibling;
                    if (prevSibling && prevSibling.nodeType === Node.TEXT_NODE) {
                        range.setStart(prevSibling, prevSibling.textContent.length);
                    } else {
                        range.setStartBefore(target.node);
                    }
                } else if (target.type === 'eof') {
                    if (target.node.nodeType === Node.TEXT_NODE) {
                        range.setStart(target.node, target.offset);
                    } else {
                        range.setStart(target.node, target.node.childNodes.length);
                    }
                } else {
                    range.setStart(target.node, target.offset);
                }
                
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                console.warn("VimBridge: Failed to set native cursor bounds", e);
            }
        },
    
        isWord: function(c) { return /^\w$/.test(c); },
        isSpace: function(c) { return c === ' ' || c === '\n' || c === 'EOF'; },
        
        getCharType: function(c, isBig) {
            if (this.isSpace(c)) return 'space';
            if (isBig) return 'word'; 
            return this.isWord(c) ? 'word' : 'punct';
        },

        preventNewlineLanding: function(i, map) {
            if (i < 0) return 0;
            if (i >= map.length) i = map.length - 1;

            if (window.vimBridge && window.vimBridge.currentMode === 'VISUAL') {
                return i;
            }

            while (i > 0 && map[i] && (map[i].char === '\n' || map[i].char === 'EOF')) {
                if (map[i - 1].char === '\n') {
                    break;
                }
                i--;
            }
            return i;
        },
        
        applyMotion: function(motionFn) {
            return (cmd) => {
                const { root, sel } = this.getSelectionInfo();
                if (!sel) return;
                
                const map = this.buildCharMap(root);
                if (map.length === 0) return;
                
                let i;
                if (window.vimBridge.currentMode === 'VISUAL' && window.vimBridge.memory.visualFocus != null) {
                    i = window.vimBridge.memory.visualFocus;
                } else {
                    i = this.getCurrentIndex(map, sel);
                }
                
                // NEW: Vim Column Memory Management
                // Initialize if it doesn't exist yet
                window.vimBridge.memory.desiredColumn = window.vimBridge.memory.desiredColumn !== undefined 
                    ? window.vimBridge.memory.desiredColumn 
                    : null;
                
                // Only j, k, gj, gk preserve the desired column. Everything else resets it.
                const isVertical = ['j', 'k', 'gj', 'gk'].includes(cmd.motion);
                if (!isVertical) {
                    window.vimBridge.memory.desiredColumn = null;
                }
                
                i = motionFn(i, map, cmd, this); 
                i = this.preventNewlineLanding(i, map);
                
                this.setCursor(map, i, sel);
            };
        }
    };
})();
