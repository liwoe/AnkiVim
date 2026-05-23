# BetterAnkiVim 🚀

A lightweight, robust Anki add-on that brings modal editing and Vim/Neovim keybindings directly into the Anki note editor. Built using a fast Python-JavaScript bridge to handle DOM manipulations natively.

## Features ✨

- **Modal Editing:** Toggle between standard input and Vim commands effortlessly.
- **Core Motions:** Seamlessly navigate text fields using standard `h`, `j`, `k`, `l` movements.
- **Registers:** Basic support for yank (`y`), delete (`d`), and paste (`p`) operations.
- **Operators & Motions:** Standard combinations like `w`, `b`, `e`, `0`, `$`, `gg`, `G`, etc.
- **Native Look:** Blends cleanly into Anki's native editor styling (`native_vim.css`).

## Current Project Structure 📂

The project is structured with modularity in mind, splitting the JavaScript engine from the Anki Python wrapper:
- `__init__.py`: Add-on entry point and Python-to-JavaScript communication bridge.
- `manifest.json` / `meta.json`: Anki add-on configurations.
- `vim_engine.js`: Core orchestrator managing the input state and modes.
- `vim_01_core.js` to `vim_05_commands.js`: Modular logic separating core operations, registers, motions, operators, and commands.

---

## ⚠️ Work in Progress / Limitations

Please note that this add-on is currently under active development. Some core Vim functionalities are **not fully implemented yet**:

* **Visual Mode:** Visual (`v`) and Visual Line (`V`) selections are not yet available.
* **Command-Line Mode:** Complex ex-commands (via `:`) and advanced parsing are still in a minimal state.
* **Complex Combos:** Certain multi-stroke operators or edge-case text objects are still being refactored.

Contributions, feedback, and bug reports are welcome!

## Installation 🛠️

### Manual Installation (Development)
1. Clone this repository into your Anki add-ons folder:
   ```bash
   # Windows (Default path)
   cd %APPDATA%\Anki2\addons21
   git clone [https://github.com/liwoe/AnkiVim.git](https://github.com/liwoe/AnkiVim.git) BetterAnkiVim

## Contribution
Feel free to commit to my project and report Issues.
It may take time to fix them as I dont have much time currently.
