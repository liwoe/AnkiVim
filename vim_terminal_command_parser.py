from .state import Mode

class CommandParser():
    def __init__(self, commands, state: Mode):
        self.commands = commands
        self.state = state

        self.commandPrefix = ""
        self.commandPrompt = ""

    def feed_key(self, key: str):
        if not self.commandPrefix and key in self.commands.command_motions:
            self.commandPrefix += key
            return

