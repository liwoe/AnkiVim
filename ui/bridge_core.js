window.vimBridge = window.vimBridge || {};

Object.assign(window.vimBridge, {
    currentMode: 'NORMAL',
    
    // Memorey for commands like f, F, t, T...
   memory: {
        lastFindMotion: null, 
        visualAnchor: null,
        visualFocus: null,
        desiredColumn: null // Remembers horizontal position for j/k
    },
    
    
    // NEW: Subdivided registries for clean modularity
    registries: {
        actions: {},      
        operators: {},
        textObjects: {},
        motionsWord: {},   // w, b, e, W, B, E
        motionsBasic: {},  // h, j, k, l, 0, ^, $, gg, G, %, (, ), {, }
        motionsFind: {},   // f, F, t, T, ;, ,
        motionsScreen: {}, // H, M, L, zz, zt, zb, Ctrl+d/u/f/b/e/y
    },

    initCursorOverlay: function() {
        if (!document.getElementById('vim-core-styles')) {
            const style = document.createElement('style');
            style.id = 'vim-core-styles';
            style.innerHTML = `
                .vim-normal .editable, 
                .vim-normal [contenteditable="true"],
                .vim-normal {
                    caret-color: transparent !important;
                }
            `;
            document.head.appendChild(style);
        }

        let overlay = document.getElementById('vim-real-cursor');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'vim-real-cursor';
            
            overlay.style.position = 'absolute'; 
            overlay.style.width = '9px'; 
            overlay.style.backgroundColor = 'rgba(150, 150, 150, 0.6)'; 
            overlay.style.pointerEvents = 'none'; 
            overlay.style.zIndex = '2147483647'; 
            overlay.style.borderRadius = '1px';
            overlay.style.display = 'none';
            
            document.body.appendChild(overlay); 
        }
        
        this.cursorOverlay = overlay;

        const { root } = this.VimDOM ? this.VimDOM.getSelectionInfo() : { root: document.body };
        if (root && !this._listenersBound) {
            root.addEventListener('mouseup', () => setTimeout(() => this.updateCursorVisuals(), 10));
            root.addEventListener('keyup', () => setTimeout(() => this.updateCursorVisuals(), 10));
            this._listenersBound = true;
        }
    },

    setMode: function(modeName) {
        let prevMode = this.currentMode;
        this.currentMode = modeName;
        
        document.body.classList.remove('vim-normal', 'vim-insert', 'vim-visual');
        document.body.classList.add('vim-' + modeName.toLowerCase());
        
        const { root, sel } = this.VimDOM ? this.VimDOM.getSelectionInfo() : { root: document.body };
        if (root && root !== document.body && root.classList) {
            root.classList.remove('vim-normal', 'vim-insert', 'vim-visual');
            root.classList.add('vim-' + modeName.toLowerCase());
        }

        // Initialize Memory when entering Visual Mode
        if (modeName === 'VISUAL' && prevMode !== 'VISUAL' && this.VimDOM && sel) {
            const map = this.VimDOM.buildCharMap(root);
            let idx = this.VimDOM.getCurrentIndex(map, sel);
            this.memory.visualAnchor = idx;
            this.memory.visualFocus = idx;
        }

        // Strict Vim ESC Physics (Insert -> Normal)
        if (prevMode === 'INSERT' && modeName === 'NORMAL' && this.VimDOM && sel && root) {
            const map = this.VimDOM.buildCharMap(root);
            if (map.length > 0) {
                let i = this.VimDOM.getCurrentIndex(map, sel);
                if (i > 0 && map[i - 1].char !== '\n') {
                    i--;
                    this.VimDOM.setCursor(map, i, sel);
                }
            }
        }
        
        if (prevMode === 'VISUAL' && modeName === 'NORMAL' && this.VimDOM && sel && root) {
            const map = this.VimDOM.buildCharMap(root);
            let focusIdx = this.memory.visualFocus !== undefined ? this.memory.visualFocus : this.memory.visualAnchor;
            
            if (focusIdx !== undefined && map.length > 0) {
                this.VimDOM.setCursor(map, focusIdx, sel);
            } else {
                sel.collapseToStart(); 
            }
            
            this.memory.visualAnchor = null;
            this.memory.visualFocus = null;
        }

        this.updateCursorVisuals();
    },

    updateCursorVisuals: function() {
        if (!this.VimDOM) return;
        this.initCursorOverlay();

        const { root, sel } = this.VimDOM.getSelectionInfo();
        if (!sel || sel.rangeCount === 0 || !this.cursorOverlay) return;

        const map = this.VimDOM.buildCharMap(root);
        if (map.length === 0) return;

        if (this.currentMode === 'NORMAL' || this.currentMode === 'VISUAL') {
            this.cursorOverlay.style.display = 'block';
            
            let i = (this.currentMode === 'VISUAL' && this.memory.visualFocus != null) 
                ? this.memory.visualFocus 
                : this.VimDOM.getCurrentIndex(map, sel);

            if (this.currentMode === 'NORMAL') {
                if (!sel.isCollapsed) sel.collapseToStart();
                let adjustedI = i;
                // Allow resting on empty lines, but if we are at the end of a populated line, step back
                while (adjustedI > 0 && map[adjustedI] && (map[adjustedI].char === '\n' || map[adjustedI].char === 'EOF')) {
                    if (map[adjustedI - 1].char === '\n') break; 
                    adjustedI--;
                }
                if (adjustedI !== i) {
                    this.VimDOM.setCursor(map, adjustedI, sel);
                    i = adjustedI; 
                }
            }

            let rect = null;
            let targetMap = map[i];
            
            if (targetMap) {
                let tempRange = document.createRange();
                
                try {
                    if (targetMap.type === 'text' && targetMap.char !== '\n') {
                        // 1. Standard text character
                        tempRange.setStart(targetMap.node, targetMap.offset);
                        if (targetMap.offset < targetMap.node.textContent.length) {
                            tempRange.setEnd(targetMap.node, targetMap.offset + 1);
                        } else {
                            tempRange.collapse(true);
                        }
                        rect = tempRange.getBoundingClientRect();
                        
                    } else if (targetMap.char === '\n') {
                        // 2. Newline handling (STRICT MAP RELIANCE)
                        let prev = i > 0 ? map[i - 1] : null;
                        
                        if (prev && prev.char !== '\n' && prev.type === 'text') {
                            // 2A. End of a populated line -> tether rigidly to the right of the previous character
                            tempRange.setStart(prev.node, prev.offset);
                            if (prev.offset < prev.node.textContent.length) {
                                tempRange.setEnd(prev.node, prev.offset + 1);
                            } else {
                                tempRange.collapse(true);
                            }
                            let pRect = tempRange.getBoundingClientRect();
                            rect = {
                                top: pRect.top,
                                left: pRect.right, // Snap immediately to the right of the text
                                height: pRect.height
                            };
                        } else {
                            // 2B. Empty line (\n\n) -> anchor strictly to the mapped element
                            if (targetMap.type === 'br') {
                                rect = targetMap.node.getBoundingClientRect();
                            } else {
                                tempRange.setStart(targetMap.node, 0);
                                tempRange.collapse(true);
                                rect = tempRange.getBoundingClientRect();
                                
                                // Fallback for detached/empty blocks returning 0,0
                                if (rect.top === 0 && rect.left === 0) {
                                    rect = targetMap.node.getBoundingClientRect();
                                }
                            }
                        }
                    } else if (targetMap.type === 'eof') {
                        // 3. End of Document
                        if (targetMap.node.nodeType === Node.TEXT_NODE) {
                            tempRange.setStart(targetMap.node, targetMap.offset);
                        } else {
                            tempRange.setStart(targetMap.node, targetMap.node.childNodes.length);
                        }
                        tempRange.collapse(true);
                        rect = tempRange.getBoundingClientRect();
                    }
                } catch (e) {
                    console.warn("VimBridge: Failed to read DOM bounds from map", e);
                }
            }

            // Ultimate Fallbacks (only if map coordinates completely failed)
            if (!rect || (rect.height === 0 && rect.width === 0) || (rect.top === 0 && rect.left === 0)) {
                try {
                    let focusRange = document.createRange();
                    focusRange.setStart(sel.focusNode, sel.focusOffset);
                    focusRange.collapse(true);
                    rect = focusRange.getBoundingClientRect();
                } catch(err) {
                    rect = sel.getRangeAt(0).getBoundingClientRect();
                }
            }

            let height = rect ? rect.height || 18 : 18; 
            if (height > 35 || height === 0) height = 18; 

            const top = (rect && rect.top !== undefined ? rect.top : 0) + window.scrollY;
            const left = (rect && rect.left !== undefined ? rect.left : 0) + window.scrollX;

            this.cursorOverlay.style.top = top + 'px';
            this.cursorOverlay.style.left = left + 'px';
            this.cursorOverlay.style.height = height + 'px';

        } else if (this.currentMode === 'INSERT') {
            this.cursorOverlay.style.display = 'none';
        }
    },

    // NEW: Handoff all logic to the Dispatcher file
    executeCommand: function(cmd) {
        if (this.Dispatcher) {
            this.Dispatcher.route(cmd);
        } else {
            console.error("VimBridge: Dispatcher not loaded.");
        }
    }
});
