import re

with open('demo-app/dist/assets/enhancements-CzLYjbLs.js') as f:
    content = f.read()

# Find the first occurrence of S4. or S4[
idx = re.search(r'(?<![a-zA-Z0-9_])S4[.\[]', content)
if idx:
    start = max(0, idx.start() - 100)
    end = min(len(content), idx.end() + 150)
    print('First S4 ref context:', repr(content[start:end]))
else:
    print('No S4 reference found')

# Check if S4 is declared anywhere as var/let/const
decl = re.search(r'(?:var|let|const)\s+S4\b', content)
if decl:
    print('S4 declared at byte:', decl.start(), repr(content[decl.start():decl.start()+50]))
else:
    print('S4 is NEVER declared in this file — uses global')

# Find how S4 is first introduced
# Look for S4= or S4 = 
assign = re.search(r'(?<![a-zA-Z0-9_])S4\s*=', content)
if assign:
    start = max(0, assign.start() - 50)
    end = min(len(content), assign.end() + 100)
    print('First S4 assignment:', repr(content[start:end]))
else:
    print('No S4 assignment found')

# Count total S4 refs
total = len(re.findall(r'(?<![a-zA-Z0-9_])S4\.', content))
print(f'Total S4. references: {total}')
