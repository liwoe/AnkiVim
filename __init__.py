from aqt import gui_hooks
from .vim_controller import VimController
from .key_interceptor import VimKeyInterceptor
from .anki_editor_adapter import AnkiEditorAdapter

active_vim_instances = {}

def on_editor_did_init(editor):
    # Initialize the JS/CSS Bridge
    adapter = AnkiEditorAdapter(editor)

    controller = VimController(editor, adapter)
    
    interceptor = VimKeyInterceptor(controller, parent=editor.widget)
    if editor.web.focusProxy():
        editor.web.focusProxy().installEventFilter(interceptor)
    else:
        editor.web.installEventFilter(interceptor)
        
    if editor.parentWindow:
        editor.parentWindow.installEventFilter(interceptor)
    active_vim_instances[id(editor)] = (controller, interceptor)

gui_hooks.editor_did_init.append(on_editor_did_init)
