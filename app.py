from flask import Flask, render_template, request, jsonify

from automata.simulator import simulate
from automata.regex_converter import convert
from automata.converter import convert_nfa_to_dfa
from automata.checker import check

app = Flask(__name__)

@app.get('/')
def index():
    return render_template('index.html')

@app.post('/api/validate')
def validate():
    data = request.get_json(silent=True) or {}
    states = data.get('states', [])
    edges = data.get('transitions', [])
    ids = [s.get('id') for s in states]
    errors = []
    if len(ids) != len(set(ids)):
        errors.append('State identifiers must be unique.')
    if sum(bool(s.get('initial')) for s in states) != 1:
        errors.append('Exactly one initial state is required.')
    for e in edges:
        if e.get('source') not in ids or e.get('target') not in ids:
            errors.append('A transition references a missing state.')
    if data.get('type') == 'DFA':
        seen = set()
        for e in edges:
            for symbol in str(e.get('label', '')).split(','):
                symbol = symbol.strip()
                if not symbol or symbol in ('ε', 'epsilon'):
                    errors.append('DFA transitions cannot be empty or epsilon.')
                key = (e.get('source'), symbol)
                if key in seen:
                    errors.append(f'DFA has multiple transitions from {key[0]} on {symbol}.')
                seen.add(key)
    return jsonify({'valid': not errors, 'errors': list(dict.fromkeys(errors))})

@app.post('/api/simulate')
def simulate_route():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify(simulate(data))
    except (ValueError, TypeError, AttributeError) as exc:
        return jsonify({'error': str(exc)}), 400

@app.post('/api/regex-to-nfa')
def regex_to_nfa():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify(convert(data.get('regex', '')))
    except (ValueError, TypeError) as exc:
        return jsonify({'error': str(exc)}), 400

@app.post('/api/nfa-to-dfa')
def nfa_to_dfa():
    try:
        return jsonify(convert_nfa_to_dfa(request.get_json(silent=True) or {}))
    except (ValueError, TypeError, AttributeError) as exc:
        return jsonify({'error': str(exc)}), 400

@app.post('/api/check')
def check_route():
    try:
        return jsonify(check(request.get_json(silent=True) or {}))
    except (ValueError, TypeError, AttributeError, KeyError) as exc:
        return jsonify({'error': str(exc)}), 400

if __name__ == '__main__':
    app.run(debug=True)
