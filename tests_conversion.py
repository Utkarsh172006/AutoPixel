import unittest
from automata.converter import convert_nfa_to_dfa
from automata.simulator import simulate
class ConversionTests(unittest.TestCase):
    def test_epsilon_and_equivalence(self):
        nfa={'type':'NFA','states':[{'id':'q0','initial':True},{'id':'q1','accepting':True}], 'transitions':[{'source':'q0','target':'q1','label':'ε'},{'source':'q1','target':'q1','label':'a'}]}
        dfa=convert_nfa_to_dfa(nfa)
        for word in ('','a','aa','b','ab'):
            self.assertEqual(simulate(dict(nfa,input=word))['accepted'],simulate(dict(dfa,input=word))['accepted'])
    def test_empty_subset(self):
        nfa={'type':'NFA','states':[{'id':'s','initial':True,'accepting':True}], 'transitions':[{'source':'s','target':'s','label':'a'}]}
        dfa=convert_nfa_to_dfa(nfa)
        self.assertEqual(len(dfa['states']),1)
    def test_nondeterminism(self):
        nfa={'type':'NFA','states':[{'id':'s','initial':True},{'id':'f','accepting':True}], 'transitions':[{'source':'s','target':'s','label':'a'},{'source':'s','target':'f','label':'a'}]}
        dfa=convert_nfa_to_dfa(nfa)
        self.assertEqual(len(dfa['states']),2)
        self.assertTrue(simulate(dict(dfa,input='a'))['accepted'])
if __name__=='__main__':unittest.main()
