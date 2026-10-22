"""One-time source-release optimization for browser-only GNSS mathematics.

Produces a portable cache of parsed original RINEX datasets. Vercel does not
run this script: the generated cache is shipped with the React source.
"""
import gzip
import pickle
import sys
from pathlib import Path

project = Path(__file__).resolve().parents[1]
source = (project.parent / 'rename_revision' /
          'VGL_Full_Dashboard_GNSS_Acquisition_Academic' / 'RINEX Explorer')
if len(sys.argv) > 1:
    source = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(source))
from rinex_explorer import load_data  # noqa: E402
from gnss_orbit import OrbitEngine  # noqa: E402
from signal_engine import SignalEngine  # noqa: E402

files = load_data(source / 'data')
obs_path, nav_path = files['obs'].path, files['nav'].path
orbit = OrbitEngine(obs_path, nav_path)
signals = SignalEngine(obs_path, nav_path)
out = project / 'public/py/precomputed.pkl.gz'
out.parent.mkdir(parents=True, exist_ok=True)
with gzip.open(out, 'wb', compresslevel=6) as stream:
    pickle.dump((files, orbit, signals), stream, protocol=4)
print('Cached parsed RINEX and original GNSS engine data:', out, out.stat().st_size, 'bytes')
