from enum import Enum

class ParseResult(Enum):
    COMPLETE = "COMPLETE"     # Ready to send to JS (e.g., "ciw", "j", "3w", '"ap')
    INCOMPLETE = "INCOMPLETE" # Waiting for more keys (e.g., "c", "ci", "2", "f", '"')
    INVALID = "INVALID"       # Typo, clear the buffer (e.g., "cz")

class VimParser:
    def __init__(self, commands, state):
        self.buffer = []
        self.commands = commands
        self.state = state

    def feed_key(self, key: str) -> tuple[ParseResult, dict | None]:
        """
        Adds a key to the buffer and evaluates the current Vim grammar.
        Returns the result state and a command dictionary if complete.
        """
        is_visual_mode = hasattr(self.state, 'mode') and self.state.mode.name.startswith("VISUAL")

        if self.buffer and isinstance(self.buffer[-1], str):
            last_char = self.buffer[-1]

            if last_char in self.commands.waiting_actions:
                return self.parse_targeted_action(key, last_char)
            
            if last_char == '"':
                self.buffer[-1] = f'"{key}'
                return ParseResult.INCOMPLETE, None

        if key == '"' and not any(isinstance(x, str) and x.startswith('"') for x in self.buffer):
            self.buffer.append(key)
            return ParseResult.INCOMPLETE, None

        if key == "0" and (not self.buffer or isinstance(self.buffer[-1], str)):
            return self._resolve_command(motion=key)

        if key in self.commands.numbers:
            return self.parse_number_key(key)

        if key in self.commands.operators:
            if is_visual_mode:
                self.buffer.append(key)
                return self._resolve_command()
            return self.parse_operator_key(key)

        has_operator = any(isinstance(x, str) and x in self.commands.operators for x in self.buffer)
        if key in self.commands.modifiers and (has_operator or is_visual_mode):
            self.buffer.append(key)
            return ParseResult.INCOMPLETE, None

        if key in self.commands.text_objects and self.buffer and self.buffer[-1] in self.commands.modifiers:
            return self._resolve_command(text_object=key)

        if key in self.commands.waiting_actions:
            self.buffer.append(key)
            return ParseResult.INCOMPLETE, None

        if key in self.commands.single_basic_motions:
            return self._resolve_command(motion=key)

        if key in self.commands.standalone_actions:
            return self._resolve_command(action=key)

        if not self.buffer and (key in self.commands.goto_insert or key in self.commands.goto_visual):
            return self._resolve_command(action=key)

        self.clear()
        return ParseResult.INVALID, None

    def parse_targeted_action(self, target_char: str, action_char: str) -> tuple[ParseResult, dict | None]:
        """Resolves sequences that require a specific target character (fx, rx, gg, zz)."""
        if action_char in ["g", "z"]:
            combined_sequence = f"{action_char}{target_char}"
            return self._resolve_command(motion=combined_sequence)
            
        elif action_char == "r":
            return self._resolve_command(action=action_char, target=target_char)
            
        else:
            return self._resolve_command(motion=action_char, target=target_char)

    def parse_number_key(self, key: str) -> tuple[ParseResult, dict | None]:
        digit = int(key)

        if not self.buffer or isinstance(self.buffer[-1], str):
            self.buffer.append(digit)
            return ParseResult.INCOMPLETE, None

        if isinstance(self.buffer[-1], int):
            # Overflow protection
            # Technically not needed for Python but this ensured a max. number.
            if self.buffer[-1] > (2147483647 - digit) // 10:
                self.clear()
                return ParseResult.INVALID, None

            self.buffer[-1] = (self.buffer[-1] * 10) + digit
            return ParseResult.INCOMPLETE, None

        self.clear()
        return ParseResult.INVALID, None

    def parse_operator_key(self, key: str) -> tuple[ParseResult, dict | None]:
        # Stage the operator if buffer empty or only has a count/register
        if not self.buffer or all(isinstance(x, int) or (isinstance(x, str) and x.startswith('"')) for x in self.buffer):
            self.buffer.append(key)
            return ParseResult.INCOMPLETE, None

        # Check for line-wise operations (e.g., 'dd', 'yy', 'cc').
        for item in reversed(self.buffer):
            if isinstance(item, str) and item in self.commands.operators:
                if item == key:
                    # The second operator press confirms a line-wise action. 
                    # We pass the operator itself as the motion to signal "this line".
                    return self._resolve_command(motion=key)
                else:
                    self.clear()
                    return ParseResult.INVALID, None

        self.clear()
        return ParseResult.INVALID, None

    def _resolve_command(self, motion=None, text_object=None, action=None, target=None) -> tuple[ParseResult, dict | None]:
        """Iterates through the buffer to extract registers, counts, operators, and modifiers."""
        count1 = 1
        count2 = 1
        operator = None
        modifier = None
        register = None

        for item in self.buffer:
            if isinstance(item, int):
                if operator is None:
                    count1 = item
                else:
                    count2 = item
            elif isinstance(item, str):
                if item.startswith('"'):
                    register = item[1:] # Extract just the character (e.g., "a" -> a)
                elif item in self.commands.operators and operator is None:
                    operator = item
                elif item in self.commands.modifiers:
                    modifier = item

        # Vim multiplies counts (e.g., 2d3w is equal to d6w)
        total_count = count1 * count2

        cmd = {
            "register": register,
            "operator": operator,
            "action": action,         # Standalone actions (x, p, r, insert/visual triggers)
            "motion": motion,         # Movement instructions (w, $, gg, f)
            "modifier": modifier,     # 'i' or 'a'
            "text_object": text_object, 
            "target": target,         # Target char for f, F, t, T, r, m
            "count": total_count,
            # Pulls the mode dynamically from the shared state reference at resolution time
            "mode": self.state.mode.name if hasattr(self.state, 'mode') else None 
        }
        
        self.clear()
        return ParseResult.COMPLETE, cmd

    def clear(self):
        """Resets the parser buffer."""
        self.buffer = []
