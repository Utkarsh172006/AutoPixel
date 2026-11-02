# AutomataLab — Phase 4

Includes Phases 1–3 plus epsilon-NFA to DFA conversion using subset construction.

Run: `python3 -m pip install -r requirements.txt` then `python3 app.py`.

Generate an NFA using `(a|b)*abb`, click **Convert NFA to DFA**, inspect the subset construction table, run the simulator, or restore the original NFA.

Tests: `python3 -m unittest discover -p "tests*.py"`

The converter creates only reachable DFA states and includes the empty/dead state when a transition requires it. Conversion is not DFA minimization.


## Phase 5 enhancements

- Play/pause simulation automatically at adjustable speeds (slow/normal/fast).
- Three ready-to-load examples: DFA ending in `a`, DFA with even count of `1`, and epsilon-NFA accepting `a*`.
- Keyboard shortcuts: V (select), S (add state), T (transition), Delete (remove selection), Space (next simulation step).
- Zoom controls, responsive layout, improved focus indicators, and polished trace interactions.
- Existing Phase 1–4 editor, import/export, simulation, regex conversion and subset construction retained.

Run tests: `python3 -m unittest discover -p 'tests_*.py' -v`

## Pixel Quest edition

- Retro pixel-game UI: title screen, XP / level / hearts HUD, neon theme.
- 7 missions (DFA, NFA, ε-NFA boss). **Submit answer** checks your machine against a reference with an exact product-BFS equivalence test and returns the shortest counterexample, which is loaded into the simulator.
- Progress is saved in the browser (localStorage). The free-play editor, regex→NFA, NFA→DFA and simulator are unchanged.
- Tests: `python3 -m unittest discover -p 'tests*.py' -v`
