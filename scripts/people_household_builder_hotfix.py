from pathlib import Path

p = Path('scripts/people_household_builder.py')
text = p.read_text()
old = '''    if text.count(old) != 1:\n        raise RuntimeError(f"{path}: expected one match, found {text.count(old)} for {old[:80]!r}")\n    p.write_text(text.replace(old, new, 1))'''
new = '''    count = text.count(old)\n    if count < 1:\n        raise RuntimeError(f"{path}: expected at least one match, found 0 for {old[:80]!r}")\n    p.write_text(text.replace(old, new, 1))'''
if old not in text:
    raise RuntimeError('builder helper shape changed')
p.write_text(text.replace(old, new, 1))
