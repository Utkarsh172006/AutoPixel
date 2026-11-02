import unittest
from automata.simulator import simulate
class SimulatorTests(unittest.TestCase):
    def test_dfa(self):
        data={'type':'DFA','states':[{'id':'q0','initial':True},{'id':'q1','accepting':True}], 'transitions':[{'source':'q0','target':'q1','label':'a'},{'source':'q1','target':'q1','label':'a'}], 'input':'aa'}
        self.assertTrue(simulate(data)['accepted'])
        data['input']='ab'
        self.assertFalse(simulate(data)['accepted'])
    def test_epsilon_nfa(self):
        data={'type':'NFA','states':[{'id':'q0','initial':True},{'id':'q1','accepting':True}], 'transitions':[{'source':'q0','target':'q1','label':'ε'}], 'input':''}
        self.assertTrue(simulate(data)['accepted'])
        self.assertEqual(simulate(data)['trace'][0]['states'],['q0','q1'])
    def test_nondeterministic_dfa(self):
        data={'type':'DFA','states':[{'id':'q0','initial':True},{'id':'q1'}], 'transitions':[{'source':'q0','target':'q0','label':'a'},{'source':'q0','target':'q1','label':'a'}], 'input':'a'}
        with self.assertRaises(ValueError):simulate(data)
if __name__=='__main__':unittest.main()
