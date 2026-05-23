class VimCommands:
    def __init__(self):
        self.numbers = set("0123456789")

        # Actions that require exactly one subsequent character stroke to complete
        self.waiting_actions = {
            "f", "F", "t", "T",  # Find/Till character
            "r",                 # Replace single character
            "m",                 # Set mark
            "g", "z",            # Multi-key sequence prefixes
            "'"                  # Go to mark
        }

        self.single_basic_motions = {
            "h", "j", "k", "l", 
            "w", "b", "e", "W", "B", "E",
            "0", "^", "$", 
            "G", "H", "M", "L",
            "(", ")", "{", "}", "%",
            "+", "-"
        }

        self.operators = {
            "c", "d", "y", 
            ">", "<", "=", "!"
        }

        self.modifiers = {"i", "a"}

        self.text_objects = {
            "w", "W", "s", "p", "b", "B", "t",
            "(", ")", "{", "}", "[", "]", "<", ">",
            "'", '"', "`"
        }

        # Actions that do not require a motion or text object to execute
        self.standalone_actions = {
            "x", "X", "p", "P", 
            "u", ".", "~", "J",
            "\x12" # Ctrl-R (Redo)
        }

        self.goto_insert = {
            "c", "C", "s", "S", 
            "i", "I", "a", "A", 
            "o", "O"
        }

        self.goto_visual = {"v", "V",}
        self.command_motions = {":", "/", "?"}
        self.goto_command = self.command_motions

    def is_motion(self, key: str) -> bool:
        return key in self.single_basic_motions

    def is_operator(self, key: str) -> bool:
        return key in self.operators

    def is_number(self, key: object) -> bool:
        if (type(key) == int):
            return True
        return False
    


