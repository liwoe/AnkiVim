from enum import Enum

class Mode(Enum):
    NORMAL = "NORMAL"
    INSERT = "INSERT"
    VISUAL = "VISUAL"
    COMMAND_NORMAL = "COMMAND_NORMAL"
    COMMAND_VISUAL = "COMMAND_VISUAL"


class VimState:
    def __init__(self):
        self.mode = Mode.NORMAL

    def set_mode(self, new_mode: Mode):
        self.mode = new_mode
        print(f"-- {self.mode.value} MODE --")
