(function() {
    window.vimBridge = window.vimBridge || {};

    window.vimBridge.Dispatcher = {
        motionMap: {
            'h': 'motionsBasic', 'j': 'motionsBasic', 'k': 'motionsBasic', 'l': 'motionsBasic',
            'gj': 'motionsBasic', 'gk': 'motionsBasic',
            '0': 'motionsBasic', '^': 'motionsBasic', '$': 'motionsBasic', 'g_': 'motionsBasic',
            'gg': 'motionsBasic', 'G': 'motionsBasic',
            '%': 'motionsBasic', '(': 'motionsBasic', ')': 'motionsBasic', '{': 'motionsBasic', '}': 'motionsBasic',
            'w': 'motionsWord', 'W': 'motionsWord', 'b': 'motionsWord', 'B': 'motionsWord', 'e': 'motionsWord', 'E': 'motionsWord',
            'f': 'motionsFind', 'F': 'motionsFind', 't': 'motionsFind', 'T': 'motionsFind', ';': 'motionsFind', ',': 'motionsFind',
            'H': 'motionsScreen', 'M': 'motionsScreen', 'L': 'motionsScreen',
            'zz': 'motionsScreen', 'zt': 'motionsScreen', 'zb': 'motionsScreen',
            '<C-d>': 'motionsScreen', '<C-u>': 'motionsScreen', '<C-f>': 'motionsScreen', '<C-b>': 'motionsScreen'
        },
        

        route: function(cmd) {
            const count = cmd.count || 1;
            const isVisual = window.vimBridge.currentMode === 'VISUAL';

            if (cmd.operator) {
                if (isVisual) {
                    let visOpHandler = window.vimBridge.registries.operators['visual_' + cmd.operator];
                    if (visOpHandler) visOpHandler(cmd);
                } else if (cmd.text_object) {
                    this.executeOperatorWithTextObject(cmd);
                } else if (cmd.motion || cmd.operator === cmd.motion) {
                    this.executeOperatorWithMotion(cmd);
                }
            } 
            else if (cmd.action) {
                let actionHandler = window.vimBridge.registries.actions[cmd.action];
                if (actionHandler) actionHandler(cmd);
            } 
            else if (cmd.motion) {
                this.routeMotion(cmd, count, isVisual);
            }

            const insertTriggers = ['i', 'I', 'a', 'A', 'o', 'O', 'c', 'C', 's', 'S'];
            if (insertTriggers.includes(cmd.action) || insertTriggers.includes(cmd.operator)) {
                window.vimBridge.setMode('INSERT');
            } else {
                window.vimBridge.updateCursorVisuals();
            }
        },

        routeMotion: function(cmd, count, isVisual) {
            const baseRegistryName = this.motionMap[cmd.motion];
            if (!baseRegistryName) return;

            if (isVisual) {
                for (let i = 0; i < count; i++) {
                    window.vimBridge.registries.motionsVisual.execute(cmd, baseRegistryName);
                }
            } else {
                const motionHandler = window.vimBridge.registries[baseRegistryName][cmd.motion];
                if (motionHandler) {
                    for (let i = 0; i < count; i++) motionHandler(cmd); 
                }
            }
        },

        executeOperatorWithTextObject: function(cmd) {
            const VimDOM = window.vimBridge.VimDOM;
            const { root, sel } = VimDOM.getSelectionInfo();
            if (!sel || !root) return;

            const map = VimDOM.buildCharMap(root);
            if (map.length === 0) return;

            let currentIndex = VimDOM.getCurrentIndex(map, sel);
            
            let toRegistry = window.vimBridge.registries.textObjects;
            if (!toRegistry || !toRegistry[cmd.text_object]) return;

            let bounds = toRegistry[cmd.text_object](currentIndex, map, cmd.modifier === 'i');
            if (!bounds) return;

            let operatorHandler = window.vimBridge.registries.operators[cmd.operator];
            if (operatorHandler) {
                operatorHandler(cmd, map, bounds[0], bounds[1], sel);
            }
        },

        executeOperatorWithMotion: function(cmd) {
            const VimDOM = window.vimBridge.VimDOM;
            const { root, sel } = VimDOM.getSelectionInfo();
            if (!sel || !root) return;

            const map = VimDOM.buildCharMap(root);
            if (map.length === 0) return;

            let startIndex = VimDOM.getCurrentIndex(map, sel);
            let targetIndex = startIndex;
            const count = cmd.count || 1;

            if (cmd.motion === cmd.operator || !cmd.motion) {
                // Line-wise execution (e.g., 'dd', '2dd', 'cc')
                let curr = startIndex;
                while (curr > 0 && map[curr - 1].char !== '\n') curr--;
                startIndex = curr;
                targetIndex = startIndex;
                
                for (let i = 0; i < count; i++) {
                    while (targetIndex < map.length - 1 && map[targetIndex].char !== '\n' && map[targetIndex].char !== 'EOF') targetIndex++;
                    if (i < count - 1 && map[targetIndex].char === '\n') targetIndex++;
                }
                targetIndex++; 
            } 
            else {
                // Motion-bound operators (e.g., 'd2w', 'c3e', 'd$')
                if (cmd.operator === 'c' && cmd.motion === 'w') cmd.motion = 'e';

                const baseRegistryName = this.motionMap[cmd.motion];
                if (!baseRegistryName) return;
                
                const motionHandler = window.vimBridge.registries[baseRegistryName][cmd.motion];
                if (!motionHandler) return;

                // SAVE ORIGINAL HOOKS
                const originalSetCursor = VimDOM.setCursor;
                const originalGetCurrentIndex = VimDOM.getCurrentIndex;
                
                // MOCK BOTH BOUNDS: Forces relative sequence tracking across compound runs
                VimDOM.setCursor = function(m, idx) { targetIndex = idx; };
                VimDOM.getCurrentIndex = function() { return targetIndex; };
                
                for (let i = 0; i < count; i++) {
                    motionHandler(cmd);
                }
                
                // RESTORE ORIGINAL HOOKS
                VimDOM.setCursor = originalSetCursor; 
                VimDOM.getCurrentIndex = originalGetCurrentIndex;

                // Handle inclusive trailing adjustments cleanly
                if (['e', 'E', 't', 'T', 'f', 'F'].includes(cmd.motion)) {
                    if (targetIndex < map.length) targetIndex++;
                }
            }

            let operatorHandler = window.vimBridge.registries.operators[cmd.operator];
            if (operatorHandler) {
                operatorHandler(cmd, map, startIndex, targetIndex, sel);
            }
            
            window.vimBridge.memory.visualFocus = null;
        }
    };
})();
