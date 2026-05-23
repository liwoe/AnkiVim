import os
import json
from aqt import mw

class AnkiEditorAdapter:
    def __init__(self, editor):
        self.editor = editor
        self._inject_ui_assets()

    def _inject_ui_assets(self):
        addon_dir = os.path.dirname(__file__)
        
        # 1. Load dependencies in strict order: DOM -> Core -> Dispatcher -> Modules
        js_files = [
            "vim_dom.js",          # Creates DOM parser & physics
            "bridge_core.js",      # Creates registries & memory
            "dispatcher.js",       # Creates the router
             # "actions.js",          # Editing triggers (x, r, i, a)
            "motions_basic.js",    # h, j, k, l, 0, ^, $, gg, G
            "motions_word.js",     # w, W, b, B, e, E
            "motions_find.js",     # f, F, t, T, ;, ,
            "motions_screen.js",   # H, M, L, zz, C-d, C-u
            "motions_visual.js",   # Visual mode (if you have it)
            "operators.js",         # Operators (d, y, c)
            "actions_extended.js",
            "text_objects.js"
        ]
        
        combined_js = ""
        for js_filename in js_files:
            js_path = os.path.join(addon_dir, "ui", js_filename)
            if os.path.exists(js_path):
                with open(js_path, "r", encoding="utf-8") as f:
                    combined_js += f.read() + "\n"
            else:
                print(f"Vim Adapter: Skipping missing file {js_filename}")
                
        self.editor.web.eval(combined_js)
        
        """
        # 2. Inject CSS
        css_path = os.path.join(addon_dir, "ui", "cursor.css")
        if os.path.exists(css_path):
            with open(css_path, "r", encoding="utf-8") as f:
                css_code = f.read()
                
            inject_css_script = f""
                var style = document.createElement('style');
                style.innerHTML = `{css_code}`;
                document.head.appendChild(style);
            ""
            self.editor.web.eval(inject_css_script)
        """

    def set_mode(self, mode_name: str):
        self.editor.web.eval(f"window.vimBridge.setMode('{mode_name}');")

    def execute_command(self, command_dict: dict):
        """Passes the parsed command dictionary from Python directly to JS."""
        json_cmd = json.dumps(command_dict)
        # Call the JS dispatcher
        self.editor.web.eval(f"window.vimBridge.executeCommand({json_cmd});")
