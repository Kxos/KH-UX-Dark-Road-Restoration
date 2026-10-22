"""Access to the tools and settings that are kept outside the public repository.

Container format decoding and protector analysis tools are kept private: they are not in this
repository. On a machine that has them, they live in a folder with the same relative layout as the
repository (`recon/tools/...`), found in this order:

  1. the KHUX_PRIVATE_TOOLS environment variable (the folder that contains `recon/tools`);
  2. `<repo>/../../private` (on the author's PC: D:/Progetto_Restauro_KH_UX/private).

The same folder holds `khux_local.json`, the local untracked configuration. The only setting read
here is where the resource key comes from: {"resource_key": {"lib": <path of the library>,
"offset": <hex string>, "length": <bytes>}}. KHUX_RESOURCE_KEY (hex) overrides it. No value is
written in this repository.

    python -I recon/tools/private_tools.py key      prints the resource key in hex
    python -I recon/tools/private_tools.py check    says whether the private tools are found

Modules: a public stub with the module's name (bgad.py, resource_index.py) calls replace(), so
`import bgad` keeps working in every tool when the private folder is present, and fails with a
clear message when it is not.
"""
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))


class MissingPrivateTools(ImportError):
    pass


def root():
    env = os.environ.get('KHUX_PRIVATE_TOOLS')
    return os.path.abspath(env if env else os.path.join(REPO, '..', '..', 'private'))


def path(name):
    """Path of a private tool in recon/tools (e.g. 'bgad_extract.py'); clear error if absent."""
    p = os.path.join(root(), 'recon', 'tools', name)
    if not os.path.isfile(p):
        raise MissingPrivateTools(
            '%s is kept outside the public repository and was not found in %s. Set KHUX_PRIVATE_TOOLS '
            'to the folder that contains recon/tools (see recon/tools/private_tools.py).'
            % (name, os.path.dirname(p)))
    return p


def replace(modname, filename=None):
    """Load the private module and put it in sys.modules in place of the calling stub."""
    p = path(filename or modname + '.py')
    d = os.path.dirname(p)
    if d not in sys.path:
        sys.path.append(d)
    spec = importlib.util.spec_from_file_location(modname, p)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[modname] = mod
    spec.loader.exec_module(mod)
    return mod


def config():
    p = os.path.join(root(), 'khux_local.json')
    if not os.path.isfile(p):
        return {}
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def resource_key_hex():
    env = os.environ.get('KHUX_RESOURCE_KEY')
    if env:
        return env.strip()
    rk = config().get('resource_key')
    if not rk:
        raise MissingPrivateTools('resource key not configured: set KHUX_RESOURCE_KEY or "resource_key" in %s'
                                  % os.path.join(root(), 'khux_local.json'))
    off, n = int(str(rk['offset']), 0), int(rk.get('length', 32))
    with open(rk['lib'], 'rb') as f:
        f.seek(off)
        b = f.read(n)
    if len(b) != n:
        raise MissingPrivateTools('resource key: %s is too short' % rk['lib'])
    return b.hex()


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    try:
        if cmd == 'key':
            print(resource_key_hex())
        elif cmd == 'check':
            for n in ('bgad.py', 'resource_index.py', 'bgad_extract.py'):
                path(n)
            print('private tools: ok (%s)' % root())
        else:
            sys.exit(__doc__)
    except (MissingPrivateTools, OSError, KeyError, ValueError) as e:
        sys.exit('private_tools: %s' % e)
