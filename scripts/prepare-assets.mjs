import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(projectRoot, 'public');
const sourceRoot = process.env.LEGACY_LAB_SOURCE ||
  path.resolve(projectRoot, '../rename_revision/VGL_Full_Dashboard_GNSS_Acquisition_Academic/RINEX Explorer');
const routes = {
  rinex: 'rinex_explorer.html',
  orbits: 'orbit_dashboard.html',
  spp: 'spp.html',
  signals: 'signals.html',
  'front-end': 'front_end.html',
  acquisition: 'acquisition.html',
  tracking: 'tracking.html'
};
const pythonFiles = [
  'rinex_explorer.py', 'gnss_orbit.py', 'orbit_geometry.py', 'signal_engine.py',
  'spp/__init__.py', 'spp/epoch_solver.py', 'spp/error_analysis.py',
  'spp/error_models.py', 'spp/least_squares.py'
];

if (!fs.existsSync(sourceRoot)) {
  if (fs.existsSync(path.join(publicDir, 'landing.html'))) {
    console.log('Using the bundled static assets.');
    process.exit(0);
  }
  throw new Error('Original laboratory source not found: ' + sourceRoot);
}

fs.mkdirSync(publicDir, { recursive: true });
const landingHTML = fs.readFileSync(path.join(sourceRoot, 'landing.html'), 'utf8');
const bodyMatch = landingHTML.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) throw new Error('Landing page body was not found');
const footerMatch = landingHTML.match(/<footer class="institutional-footer" id="footer">[\s\S]*?<\/footer>/);
if (!footerMatch) throw new Error('Landing page footer was not found');

// Preserve the exact approved landing markup while rendering it through React.
fs.writeFileSync(path.join(projectRoot, 'src/landing-body.generated.js'),
  '// Generated from the approved landing page; edit landing.html in the source instead.\n' +
  'export default ' + JSON.stringify(bodyMatch[1]) + ';\n');

function dashboardHTML(html) {
  if (!/<\/head>/i.test(html) || !/<\/body>/i.test(html))
    throw new Error('Invalid dashboard document');
  // One shared footer on every dashboard, including the original RINEX page
  // whose legacy custom footer contained several embedded bitmap logos.
  return fixMissingReference(html.replace(/<footer class="institutional-footer"[^>]*>[\s\S]*?<\/footer>/i, ''))
    .replace(/<head>/i, '<head>\n<script src="/api_browser.js"></script>')
    .replace(/<\/head>/i,
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&amp;family=Manrope:wght@500..800&amp;display=swap">' +
      '<link rel="stylesheet" href="/lab_chrome.css">' +
      '<link rel="stylesheet" href="/lab_footer.css">' +
      '<script defer src="/lab_chrome.js"></script></head>')
    .replace(/<\/body>/i, footerMatch[0] + '</body>');
}

function fixMissingReference(source) {
  // The inherited orbit chapter linked to a Reference_Frames.pdf that was
  // absent from the original archive. Point it to its already-cited official
  // IERS frame reference so students are not sent to a broken local file.
  return source
    .replace(/<a href="\/reference\/Reference_Frames\.pdf#page=\d+" target="_blank">[^<]*<\/a>/g,
      '<a href="https://iers-conventions.obspm.fr/conventions/content/tn36.pdf#page=43" target="_blank" rel="noopener">IERS Conventions (2010), Chapter 5 — reference frames</a>')
    .replace('The supplied PDF distinguishes', 'The IERS reference distinguishes');
}

for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|css|js)$/i.test(entry.name)) {
    const original = fs.readFileSync(path.join(sourceRoot, entry.name));
    let output = entry.name.endsWith('.html') && entry.name !== 'landing.html'
      ? dashboardHTML(original.toString('utf8'))
      : original;
    if (entry.name === 'lab_chrome.js') {
      output = original.toString('utf8').replace(
        'const route = aliases[location.pathname] || location.pathname;',
        "const cleanPath = location.pathname.replace(/\\/$/, '') || '/';\n  const route = aliases[cleanPath] || cleanPath;"
      );
    }
    if (entry.name === 'orbit_visuals.js') output = fixMissingReference(output.toString('utf8'));
    // The React entry is index.html; landing.html is retained for provenance.
    fs.writeFileSync(path.join(publicDir, entry.name), output);
  } else if (entry.isDirectory() &&
             ['vendor', 'data', 'reference', 'landing_assets', 'footer_logos'].includes(entry.name)) {
    const target = path.join(publicDir, entry.name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(path.join(sourceRoot, entry.name), target, {
      recursive: true, force: true,
      filter: source => !path.basename(source).startsWith('.') &&
        !(entry.name === 'vendor' && source.endsWith('.gz'))
    });
  }
}

for (const [route, file] of Object.entries(routes)) {
  const folder = path.join(publicDir, route);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'),
    dashboardHTML(fs.readFileSync(path.join(sourceRoot, file), 'utf8')));
}

// Browser-side Python interpreter receives the exact scientific engine code.
for (const file of pythonFiles) {
  const destination = path.join(publicDir, 'py', file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(sourceRoot, file), destination);
}
fs.copyFileSync(path.join(projectRoot, 'browser_backend.py'),
  path.join(publicDir, 'py/browser_backend.py'));
fs.copyFileSync(path.join(projectRoot, 'browser_worker.js'),
  path.join(publicDir, 'browser_worker.js'));
fs.copyFileSync(path.join(projectRoot, 'api_browser.js'),
  path.join(publicDir, 'api_browser.js'));

const scientificPaths = ['/py/browser_backend.py', ...pythonFiles.map(file => '/py/' + file)];
if (fs.existsSync(path.join(publicDir, 'py/precomputed.pkl.gz')))
  scientificPaths.push('/py/precomputed.pkl.gz');
const visitData = (folder) => {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const child = path.join(folder, entry.name);
    if (entry.isDirectory()) visitData(child);
    else if (entry.isFile()) scientificPaths.push('/' + path.relative(publicDir, child).split(path.sep).join('/'));
  }
};
visitData(path.join(publicDir, 'data'));
fs.writeFileSync(path.join(publicDir, 'python-assets.json'),
  JSON.stringify({ paths: scientificPaths }, null, 2));

const constellationScript = [
  'window.GNSS_COLORS=Object.freeze(' +
    JSON.stringify({G:'#55a8ff',R:'#ff7e7e',E:'#48d6c7',J:'#dc8bff',C:'#ffc45b',S:'#9b9fff'}) + ');',
  'window.GNSS_NAMES=Object.freeze(' +
    JSON.stringify({G:'GPS',R:'GLONASS',E:'Galileo',J:'QZSS',C:'BeiDou',S:'SBAS'}) + ');',
  'for(const [s,c] of Object.entries(GNSS_COLORS))' +
    'document.documentElement.style.setProperty("--"+s,c);'
].join('\n');
fs.mkdirSync(path.join(publicDir, 'api'), { recursive: true });
fs.writeFileSync(path.join(publicDir, 'api/constellations.js'), constellationScript);

console.log('Prepared all seven dashboard routes, institutional footer, GNSS data, and browser Python engine.');
