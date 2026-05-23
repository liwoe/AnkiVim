from aqt.qt import Qt
from .state import VimState, Mode
from .parser import VimParser, ParseResult
from .commands import VimCommands

class VimController:
    def __init__(self, editor, adapter):
        self.editor = editor
        self.adapter = adapter
        self.state = VimState()
        self.commands = VimCommands()
        self.parser = VimParser(self.commands, self.state)
        
        self.adapter.set_mode(self.state.mode.name)

    def handle_key(self, key, text, modifiers):
        # 1. Universal Escape
        if key == Qt.Key.Key_Escape:
            self.parser.clear()
            self._transition_to(Mode.NORMAL)
            return True 

        # 2. Insert Mode Pass-through
        if self.state.mode == Mode.INSERT:
            return False

        # 3. Handle Command/Search Modes (:, /, ?)
        if self.state.mode in [Mode.COMMAND_VISUAL, Mode.COMMAND_NORMAL]:
            # TODO: Terminal buffering logic.
            return True

        if not text:
            return False 

        # 4. Mode Triggers (Entering Command Mode)
        if text in self.commands.goto_command:
            new_mode = Mode.COMMAND_VISUAL if self.state.mode == Mode.VISUAL else Mode.COMMAND_NORMAL
            self._transition_to(new_mode)
            return True

        # 5. Feed to Parser
        result, command = self.parser.feed_key(key=text)

        if result == ParseResult.INVALID:
            return True 

        if result == ParseResult.COMPLETE and command:
            self.adapter.execute_command(command)
            self._handle_post_command_state(command)
            return True

        return True # Catch-all for INCOMPLETE to prevent Anki from typing

    def _handle_post_command_state(self, command):
        """Determines if we should switch modes based on the executed command."""
        action = command.get("action")
        operator = command.get("operator")
        
        # Jump to INSERT? (i, a, c, s, etc.)
        if action in self.commands.goto_insert or operator in self.commands.goto_insert:
            self._transition_to(Mode.INSERT)
            
        # Jump to VISUAL? (v, V)
        elif action in self.commands.goto_visual:
            if self.state.mode == Mode.VISUAL and action == "v":
                self._transition_to(Mode.NORMAL)
            else:
                self._transition_to(Mode.VISUAL)
        
        # Exit VISUAL after an operation (d, y, p in visual mode)
        elif self.state.mode == Mode.VISUAL and (operator or action):
            self._transition_to(Mode.NORMAL)

    def _transition_to(self, new_mode):
        """Unified method to keep State and JS Adapter in sync."""
        self.state.set_mode(new_mode)
        self.adapter.set_mode(new_mode.name)
