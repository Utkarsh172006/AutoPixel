"""Epsilon-NFA to DFA via reachable subset construction."""
from collections import deque

def convert_nfa_to_dfa(data):
    states = data.get('states', [])
    transitions = data.get('transitions', [])
    if data.get('type') != 'NFA':
        raise ValueError('Choose NFA before converting.')
    if not isinstance(states, list) or not isinstance(transitions, list) or len(states)>150 or len(transitions)>1500:
        raise ValueError('Invalid or oversized NFA.')
    ids=[s.get('id') for s in states]
    if not all(isinstance(x,str) and x for x in ids) or len(ids)!=len(set(ids)):
        raise ValueError('State IDs must be unique nonempty strings.')
    initial=[s['id'] for s in states if s.get('initial')]
    if len(initial)!=1: raise ValueError('Exactly one initial state is required.')
    finals={s['id'] for s in states if s.get('accepting')}
    delta={}; epsilon={}; alphabet=set()
    for t in transitions:
        src,dst=t.get('source'),t.get('target')
        if src not in ids or dst not in ids: raise ValueError('Transition references unknown state.')
        for symbol in str(t.get('label','')).split(','):
            symbol=symbol.strip()
            if not symbol: raise ValueError('Transition labels cannot be empty.')
            if symbol in ('ε','epsilon'):
                epsilon.setdefault(src,set()).add(dst)
            else:
                if len(symbol)!=1: raise ValueError('Symbols must be one character.')
                alphabet.add(symbol)
                delta.setdefault((src,symbol),set()).add(dst)
    alphabet=sorted(alphabet)
    def closure(seed):
        found=set(seed); todo=list(seed)
        while todo:
            for nxt in epsilon.get(todo.pop(),()):
                if nxt not in found: found.add(nxt);todo.append(nxt)
        return frozenset(found)
    start=closure(initial)
    queue=deque([start]); labels={start:'D0'}; subsets=[start]; edges=[]; table=[]
    while queue:
        subset=queue.popleft(); source=labels[subset]; row={'state':source,'subset':sorted(subset),'accepting':bool(subset & finals),'moves':{}}
        for symbol in alphabet:
            reached=set()
            for state in subset: reached.update(delta.get((state,symbol),()))
            target=closure(reached)
            if target not in labels:
                if len(labels)>=512: raise ValueError('Too many DFA states (limit 512).')
                labels[target]=f'D{len(labels)}';subsets.append(target);queue.append(target)
            row['moves'][symbol]=labels[target]
            edges.append({'id':f'e{len(edges)}','source':source,'target':labels[target],'label':symbol})
        table.append(row)
    dfa_states=[{'id':labels[subset],'label':labels[subset],'initial':subset==start,'accepting':bool(subset & finals)} for subset in subsets]
    return {'type':'DFA','states':dfa_states,'transitions':edges,'alphabet':alphabet,'table':table}
