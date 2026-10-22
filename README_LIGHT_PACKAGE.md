# Smaller deployment package

This is the lightweight version of the NCGSA Virtual GNSS Laboratory.

- All seven interactive dashboards, their JavaScript, RINEX observation and
  navigation datasets, and the browser-side scientific WebAssembly engine are
  included.
- All typography, navigation, institutional logos and shared footer are
  included.
- The large optional study/reference PDF collection was excluded to make
  downloading substantially easier. Links to locally referenced PDFs will
  remain unavailable until those PDF files are uploaded separately into the
  matching `public/reference/` folder (source) or `reference/` (cPanel build).

Use the deployment instructions from the conversation. For Vercel, extract
the SOURCE ZIP, upload its files to GitHub, and set Vite build command
`npm run build` and output directory `dist`. For cPanel, extract the BUILD
ZIP contents into `public_html`.

No runtime backend or database is required. The scientific Python models
run entirely in the browser through a WebAssembly worker, fetching its
runtime and NumPy from jsDelivr when first needed.
