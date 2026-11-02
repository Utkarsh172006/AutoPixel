import unittest
from automata.checker import check
def m(mission,typ,states,trans):
    return {'mission':mission,'type':typ,'states':[{'id':i,'initial':i==states[0],'accepting':i in states[-1:] if False else False} for i in states],'transitions':[]}
class CheckerTests(unittest.TestCase):
    def machine(self,mission,typ,init,acc,edges):
        ids=sorted({init,*acc,*[e[0] for e in edges],*[e[1] for e in edges]})
        return {'mission':mission,'type':typ,'states':[{'id':i,'initial':i==init,'accepting':i in acc} for i in ids],'transitions':[{'source':a,'target':b,'label':l} for a,b,l in edges]}
    def test_correct_dfa(self):
        d=self.machine('ends-a','DFA','q0',['q1'],[('q0','q0','b'),('q0','q1','a'),('q1','q1','a'),('q1','q0','b')])
        self.assertTrue(check(d)['correct'])
    def test_wrong_gives_shortest_counterexample(self):
        d=self.machine('ends-a','DFA','q0',['q0'],[('q0','q0','b'),('q0','q1','a'),('q1','q1','a'),('q1','q0','b')])
        r=check(d); self.assertFalse(r['correct']); self.assertEqual(r['counterexample'],'')
    def test_nfa_ends_abb(self):
        d=self.machine('ends-abb','NFA','s',['f'],[('s','s','a,b'),('s','a1','a'),('a1','b1','b'),('b1','f','b')])
        self.assertTrue(check(d)['correct'])
    def test_boss_with_epsilon(self):
        d=self.machine('boss','NFA','s',['x','y'],[('s','x','ε'),('s','y','ε'),('x','x','a'),('y','z','a'),('z','y','b')])
        self.assertTrue(check(d)['correct'])
    def test_state_limit_and_type(self):
        d=self.machine('contains-ab','DFA','q0',['q3'],[('q0','q0','b'),('q0','q1','a'),('q1','q1','a'),('q1','q2','b'),('q2','q3','a'),('q3','q3','a,b')])
        self.assertFalse(check(d)['correct'])
        with self.assertRaises(ValueError): check(dict(d,type='NFA'))
if __name__=='__main__':unittest.main()
