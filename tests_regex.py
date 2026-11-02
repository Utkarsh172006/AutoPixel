import unittest
from automata.regex_converter import convert
from automata.simulator import simulate

class RegexTests(unittest.TestCase):
    def check(self,regex,accepted,rejected):
        machine=convert(regex)
        for word in accepted:
            self.assertTrue(simulate({**machine,'input':word})['accepted'],(regex,word))
        for word in rejected:
            self.assertFalse(simulate({**machine,'input':word})['accepted'],(regex,word))
    def test_union_star_concat(self):self.check('(a|b)*abb',['abb','aabb','babb','abababb'],['','ab','abba','baa'])
    def test_plus(self):self.check('a+',['a','aa','aaa'],['','b','ab'])
    def test_optional(self):self.check('ab?',['a','ab'],['','abb','b'])
    def test_epsilon(self):self.check('ε|a',['','a'],['aa','b'])
    def test_bad(self):
        for r in ['','a|','(ab','*a','a||b']:
            with self.assertRaises(ValueError):convert(r)
if __name__=='__main__':unittest.main()
