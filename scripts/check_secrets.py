#!/usr/bin/env python3
"""Scan the working tree for secrets, credentials and anything that must not
be committed (tokens, private keys, .env files, credentials files)."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# High-signal secret patterns. Word boundaries / context keep false positives low.
PATTERNS = [
    (r'ghp_[0-9A-Za-z]{36,}', 'GitHub personal access token'),
    (r'github_pat_[0-9A-Za-z_]{82,}', 'GitHub fine-grained token'),
    (r'-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----', 'private key'),
    (r'AIza[0-9A-Za-z_\-]{35}', 'Google API key'),
    (r'sk_live_[0-9A-Za-z]{24,}', 'live secret key (Stripe-style)'),
    (r'aws_access_key_id\s*=\s*["\']?AKIA[0-9A-Z]{16}', 'AWS access key'),
    (r'\bpassword\s*=\s*["\'][^"\']{6,}["\']', 'hardcoded password'),
    (r'\bsecret\s*=\s*["\'][^"\']{12,}["\']', 'hardcoded secret'),
    (r'xoxb-[0-9]{10,}-[0-9]{10,}', 'Slack bot token'),
    (r'eyJ[0-9A-Za-z_\-]{10,}\.[0-9A-Za-z_\-]{10,}', 'JWT'),
]

# Never commit these paths.
FORBIDDEN_FILES = [
    '.env', '.env.local', '.env.production', '.env.development',
    '.git-credentials', 'credentials.json', 'service-account.json',
    'id_rsa', 'id_ed25519', '.npmrc', '.netrc',
]

ALLOWED = {'.git', 'node_modules', '.gitignore'}
problems = []
scanned = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ALLOWED]
    for fn in filenames:
        fp = os.path.join(dirpath, fn)
        rel = os.path.relpath(fp, ROOT)
        base = os.path.basename(fn)
        if base in FORBIDDEN_FILES or base.endswith('.pem'):
            problems.append('FORBIDDEN FILE: %s' % rel)
            continue
        # only scan text-ish files
        if os.path.splitext(fn)[1].lower() in ('.png', '.jpg', '.jpeg', '.webp',
                '.woff2', '.woff', '.ico', '.gif', '.zip', '.gz'):
            continue
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                text = fh.read()
        except OSError:
            continue
        scanned += 1
        for pat, label in PATTERNS:
            for m in re.finditer(pat, text, re.IGNORECASE):
                line = text[:m.start()].count('\n') + 1
                problems.append('%s:%d  %s  -> %s' % (rel, line, label, m.group(0)[:28]))

print('scanned %d text files' % scanned)
if problems:
    print('\nSECURITY PROBLEMS:')
    for p in problems:
        print('  ' + p)
    sys.exit(1)
print('OK: no secrets, credentials or forbidden files found')
