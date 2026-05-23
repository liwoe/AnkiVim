# BetterAnkiVim 🚀

A lightweight, robust Anki add-on that brings modal editing and Vim/Neovim keybindings directly into the Anki note editor. Built using a fast Python-JavaScript bridge to handle DOM manipulations natively.

## Features ✨

- **Modal Editing:** Toggle between standard input and Vim commands effortlessly.
- **Core Motions:** Seamlessly navigate text fields using standard `h`, `j`, `k`, `l` movements.
- **Registers:** Basics for delete (`d`). The yank (`y`) and paste (`p`) commands will be implemented soon. 
- **Operators & Motions:** Standard combinations like `w`, `b`, `e`, `0`, `$`, `gg`, `G`, etc.
- **Native Look:** Blends cleanly into Anki's native editor styling (`native_vim.css`).

## Current Project Structure 📂

The project is structured with modularity in mind, splitting the JavaScript engine from the Anki Python wrapper:
- `__init__.py`: Add-on entry point and Python-to-JavaScript communication bridge.
- `manifest.json` / `meta.json`: Anki add-on configurations.
- `parser.py`: Is the core for this project. Instead of directly handeling commands etc. I wrote an own python parser.
- `/UI`: For this project to work I needed javascript injections. The parsed commands get handled in this folder. (I will rename this folder soon)

---

## ⚠️ Work in Progress / Limitations

Please note that this add-on is currently under active development. Some core Vim functionalities are **not fully implemented yet**:

* **Visual Mode:** Visual (`v`) and Visual Line (`V`) selections: The commands / motions don't work in here yet.
* **Command-Line Mode:** Complex commands (via `:`) and advanced parsing are still not implemented at all.
* **Complex Combos:** Certain multi-stroke operators or edge-case text objects are still being refactored. Like (`<ul>') tags.

## Installation 🛠️

### Manual Installation (Development)
1. Option: Just download via the Anki-Addon page you came from. (Follow instructions there.): https://ankiweb.net/shared/info/978943807?cb=1779547478922

2. Option: Clone this repository into your Anki add-ons folder:
   ```bash
   cd %APPDATA%\Anki2\addons21
   git clone [https://github.com/liwoe/AnkiVim.git](https://github.com/liwoe/AnkiVim.git) BetterAnkiVim

## Contribution
Feel free to commit to my project and report Issues/Bugs.
It may take some time for to fix them and implement other stuff as I dont have much time currently.
