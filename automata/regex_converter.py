"""Regex to epsilon-NFA via Thompson construction. Single-character symbols."""

def tokenize(regex):
    if not isinstance(regex,str) or not regex.strip():
        raise ValueError('Enter a nonempty regular expression.')
    tokens=[]
    for ch in regex:
        if ch.isspace(): continue
        if ch.isalnum() or ch in '_ε|()*+?': tokens.append(ch)
        else: raise ValueError(f'Unsupported regex character: {ch!r}. Use letters, digits, _, ε, |, (), *, +, ?.')
    if len(tokens)>120: raise ValueError('Regex is too long (maximum 120 tokens).')
    return tokens

def postfix(regex):
    tokens=tokenize(regex); expanded=[]
    def end(t): return t.isalnum() or t in ('_', 'ε', ')', '*', '+', '?')
    def begin(t): return t.isalnum() or t in ('_', 'ε', '(')
    for t in tokens:
        if expanded and end(expanded[-1]) and begin(t): expanded.append('·')
        expanded.append(t)
    precedence={'|':1,'·':2}; stack=[]; output=[]
    for t in expanded:
        if t.isalnum() or t in ('_','ε'): output.append(t)
        elif t=='(': stack.append(t)
        elif t==')':
            while stack and stack[-1]!='(': output.append(stack.pop())
            if not stack: raise ValueError('Unmatched closing parenthesis.')
            stack.pop()
        elif t in ('*','+','?'): output.append(t)
        else:
            while stack and stack[-1]!='(' and precedence[stack[-1]]>=precedence[t]:output.append(stack.pop())
            stack.append(t)
    while stack:
        t=stack.pop()
        if t=='(': raise ValueError('Unmatched opening parenthesis.')
        output.append(t)
    return output

def convert(regex):
    p=postfix(regex); transitions=[]; stack=[]; count=0
    def state():
        nonlocal count
        s=f'q{count}';count+=1;return s
    def edge(a,b,label): transitions.append({'id':f'e{len(transitions)}','source':a,'target':b,'label':label})
    for t in p:
        if t.isalnum() or t in ('_','ε'):
            a,b=state(),state();edge(a,b,t);stack.append((a,b))
        elif t=='·':
            if len(stack)<2: raise ValueError('Missing operand for concatenation.')
            b=stack.pop();a=stack.pop();edge(a[1],b[0],'ε');stack.append((a[0],b[1]))
        elif t=='|':
            if len(stack)<2: raise ValueError('Missing operand for union (|).')
            b=stack.pop();a=stack.pop();s,f=state(),state()
            for x,y in [(s,a[0]),(s,b[0]),(a[1],f),(b[1],f)]:edge(x,y,'ε')
            stack.append((s,f))
        elif t in ('*','+','?'):
            if not stack: raise ValueError(f'Missing operand for {t}.')
            a=stack.pop();s,f=state(),state();edge(s,a[0],'ε');edge(a[1],f,'ε')
            if t in ('*','+'):edge(a[1],a[0],'ε')
            if t in ('*','?'):edge(s,f,'ε')
            stack.append((s,f))
    if len(stack)!=1:raise ValueError('Invalid regex: check operators and operands.')
    initial,final=stack[0]
    if count>250:raise ValueError('Regex produces too many states.')
    states=[{'id':f'q{i}','label':f'q{i}','initial':f'q{i}'==initial,'accepting':f'q{i}'==final} for i in range(count)]
    return {'type':'NFA','states':states,'transitions':transitions,'regex':regex}
