"""Mission checker: exact language-equivalence test (product BFS) against a regex reference."""
from collections import deque
from .regex_converter import convert
from .converter import convert_nfa_to_dfa
from .simulator import simulate

MISSIONS = {
    'ends-a':   {'type': 'DFA', 'regex': '(a|b)*a'},
    'contains-ab': {'type': 'DFA', 'regex': '(a|b)*ab(a|b)*', 'max': 3},
    'even-ones': {'type': 'DFA', 'regex': '0*(10*10*)*'},
    'no-aa':    {'type': 'DFA', 'regex': '(b|ab)*a?'},
    'ends-abb': {'type': 'NFA', 'regex': '(a|b)*abb'},
    'a-then-b': {'type': 'NFA', 'regex': 'a*b*'},
    'boss':     {'type': 'NFA', 'regex': '(ab)*|a*'},
}

def check(data):
    m = MISSIONS.get(data.get('mission'))
    if not m: raise ValueError('Unknown mission.')
    if data.get('type') != m['type']: raise ValueError(f"This mission needs a {m['type']}.")
    simulate({**data, 'input': ''})  # validates structure, determinism, symbols
    states, trans = data['states'], data['transitions']
    if m.get('max') and len(states) > m['max']:
        return {'correct': False, 'message': f"Use at most {m['max']} states (you used {len(states)})."}
    ref = convert_nfa_to_dfa(convert(m['regex']))
    rstart = next(s['id'] for s in ref['states'] if s['initial'])
    racc = {s['id'] for s in ref['states'] if s['accepting']}
    rdelta = {(t['source'], t['label']): t['target'] for t in ref['transitions']}
    delta, eps = {}, {}
    for t in trans:
        for sym in (x.strip() for x in str(t['label']).split(',')):
            if sym in ('ε', 'epsilon'): eps.setdefault(t['source'], set()).add(t['target'])
            else: delta.setdefault((t['source'], sym), set()).add(t['target'])
    finals = {s['id'] for s in states if s.get('accepting')}
    def closure(seed):
        seen, todo = set(seed), list(seed)
        while todo:
            for n in eps.get(todo.pop(), ()):
                if n not in seen: seen.add(n); todo.append(n)
        return frozenset(seen)
    alpha = sorted(set(ref['alphabet']) | {k[1] for k in delta})
    start = (closure([s['id'] for s in states if s.get('initial')]), rstart)
    seen = {start: ''}; queue = deque([start])
    while queue:
        key = queue.popleft(); p, r = key; word = seen[key]
        if bool(p & finals) != (r in racc):
            return {'correct': False, 'counterexample': word, 'should_accept': r in racc,
                    'message': f"Bug found! '{word or 'ε (empty string)'}' should be {'ACCEPTED' if r in racc else 'REJECTED'}."}
        for a in alpha:
            nxt = (closure({t for s in p for t in delta.get((s, a), ())}), rdelta.get((r, a)))
            if nxt not in seen: seen[nxt] = word + a; queue.append(nxt)
    return {'correct': True, 'message': 'Mission complete!'}
