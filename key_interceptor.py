from aqt.qt import QObject, QEvent, Qt

class VimKeyInterceptor(QObject):
    def __init__(self, controller, parent=None):
        super().__init__(parent)
        self.controller = controller

    def eventFilter(self, obj, event):
        if event.type() == QEvent.Type.KeyPress:
            key = event.key()

            if obj == self.controller.editor.parentWindow:
                if key == Qt.Key.Key_Escape:
                    # Swallow the Escape key force NORMAL_MODE
                    self.controller.handle_key(key, "", event.modifiers())
                    return True 
                # Let the window handle all other global shortcuts normally
                return False 

            # If the event is caught on the text editor (focusProxy)
            text = event.text()
            modifiers = event.modifiers()

            handled = self.controller.handle_key(key, text, modifiers)
            
            if handled:
                return True # Swallow the key so Anki doesn't type it

        return super().eventFilter(obj, event)
