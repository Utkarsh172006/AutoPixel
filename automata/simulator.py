"""DFA/NFA simulator with epsilon closure and per-symbol execution traces."""

def simulate(data):
    states = data.get('states', [])
    transitions = data.get('transitions', [])
    word = data.get('input', '')
    kind = data.get('type', 'DFA')
    if kind not in ('DFA', 'NFA'):
        raise ValueError('Machine type must be DFA or NFA.')
    if not isinstance(word, str) or len(word) > 1000:
        raise ValueError('Input must be a string of at most 1000 characters.')
    if not isinstance(states, list) or not isinstance(transitions, list) or len(states) > 500 or len(transitions) > 5000:
        raise ValueError('Invalid or oversized automaton.')
    ids = [s.get('id') for s in states]
    if not all(isinstance(x, str) for x in ids) or len(set(ids)) != len(ids):
        raise ValueError('State IDs must be unique strings.')
    initials = [s['id'] for s in states if s.get('initial')]
    if len(initials) != 1:
        raise ValueError('Exactly one initial state is required.')
    finals = {s['id'] for s in states if s.get('accepting')}
    delta = {}
    eps = {}
    for t in transitions:
        src, dst = t.get('source'), t.get('target')
        if src not in ids or dst not in ids:
            raise ValueError('Transition references an unknown state.')
        symbols = [x.strip() for x in str(t.get('label', '')).split(',')]
        if any(not x for x in symbols):
            raise ValueError('Transition labels cannot be empty. Use ε for epsilon.')
        for sym in symbols:
            if sym in ('ε', 'epsilon'):
                if kind == 'DFA':
                    raise ValueError('DFA cannot contain epsilon transitions.')
                eps.setdefault(src, set()).add(dst)
            else:
                if len(sym) != 1:
                    raise ValueError('Each transition symbol must be one character (or ε).')
                targets = delta.setdefault((src, sym), set())
                targets.add(dst)
                if kind == 'DFA' and len(targets) > 1:
                    raise ValueError(f'DFA is nondeterministic at {src} on {sym}.')
    def closure(seed):
        reached = set(seed)
        stack = list(seed)
        while stack:
            for nxt in eps.get(stack.pop(), ()):
                if nxt not in reached:
                    reached.add(nxt)
                    stack.append(nxt)
        return reached
    active = closure(initials)
    trace = [{'step': 0, 'symbol': None, 'states': sorted(active)}]
    for index, char in enumerate(word, 1):
        moved = set()
        for state in active:
            moved.update(delta.get((state, char), ()))
        active = closure(moved)
        trace.append({'step': index, 'symbol': char, 'states': sorted(active)})
    return {'accepted': bool(active & finals), 'trace': trace, 'final_states': sorted(active), 'input': word, 'type': kind}
