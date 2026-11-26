/**
 * Before/after images for the site, from the same library the TikTok posts use (youmarkt):
 *   <source>/library/photos.json + library/<photo>   — the original ("before")
 *   <source>/renders/<look>/<photo>.jpg              — the same photo developed by the real Halatto engine ("after")
 * Nothing is drawn or simulated here: both halves are cropped identically (4:5) and encoded as WebP with ffmpeg.
 *
 *   npm run before-after            # all entries of build/before-after.json
 *   npm run before-after -- --only disposable-camera-filter-on-iphone
 *
 * Output: img/before-after/<slug>-{before,after}{,@2x}.webp, img/looks/photo/<look>.webp and
 * build/before-after.manifest.json (read by build/build.js).
 *
 * An entry may add tools on top of the look (or use them alone, without "look"): "extras": ["dateStamp"],
 * ["aging.shoebox"], ["grain.pushed"] — the names HalattoSiteExamplesTests (QutjoWukmp) knows. Those renders live in
 * build/before-after-renders/<look>+<extras>/<photo>.jpg. Missing renders are written to
 * build/before-after.render-job.json; `npm run before-after:render` develops them on the simulator and reruns this.
 * Until then the entry keeps the picture it had.
 * HALATTO_LIBRARY overrides the "source" path of the config.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'before-after.json');
const MANIFEST_PATH = path.join(__dirname, 'before-after.manifest.json');
const OUT_DIR = path.join(ROOT, 'img', 'before-after');
const LOOKS_OUT_DIR = path.join(ROOT, 'img', 'looks', 'photo');

/** The 14 looks: key (folder under renders/, icon name in img/looks/) -> name in the app. */
const LOOK_NAMES = {
    tungsten800: 'Tungsten 800', titan38: 'Titan 38', mju35: 'Mju 35', snap400: 'Snap 400', snapGold: 'Snap Gold',
    sxFold: 'SX Fold', square600: 'Square 600', miniInstant: 'Mini Instant', tunnel35: 'Tunnel 35', toy120: 'Toy 120',
    dream120: 'Dream 120', silverIX: 'Silver IX', cyberBlue: 'Cyber Blue', digi2MP: 'Digi 2MP'
};

/** How a tool added on top of a look is named on the picture's label (the app's own tool names). */
const EXTRA_LABELS = { dateStamp: 'Date stamp', aging: 'Aging', grain: 'Grain', frame: 'Frame' };

/** A frame turns the photo into a card of another shape on a transparent ground: rendered as PNG, shown whole. */
function hasFrame(entry) {
    return (entry.extras || []).some((extra) => extra.startsWith('frame.'));
}
const SITE_RENDERS_DIR = path.join(__dirname, 'before-after-renders');
const JOB_PATH = path.join(__dirname, 'before-after.render-job.json');

function extrasOf(entry) {
    const extras = entry.extras || [];
    for (const extra of extras) {
        if (!EXTRA_LABELS[extra.split('.')[0]]) throw new Error(`Unknown extra "${extra}"`);
    }
    return extras;
}

/** "Snap 400 + Date stamp", "Grain": what the after label and caption call the edit. */
function editName(entry) {
    const names = [...new Set(extrasOf(entry).map((extra) => EXTRA_LABELS[extra.split('.')[0]]))];
    return [entry.look ? LOOK_NAMES[entry.look] : null, ...names].filter(Boolean).join(' + ');
}

const SIZES = { guide: [640, 800], home: [800, 1000], look: [240, 300] };

/** `/img/x.webp?v=1a2b3c4d`: the file names never change, so a re-cut picture needs a new URL to get past caches. */
function versioned(url) {
    const hash = require('crypto').createHash('md5').update(fs.readFileSync(path.join(ROOT, url))).digest('hex').slice(0, 8);
    return `${url}?v=${hash}`;
}

/** The whole picture inside w×h, transparent around it (a framed card must not be cropped). */
function encodeContained(input, output, [w, h], scale = 1) {
    const W = w * scale, H = h * scale;
    execFileSync('ffmpeg', [
        '-v', 'error', '-y', '-i', input,
        // Sits at the bottom of the tile: the top is left free for the Before / After label.
        '-vf', `scale=${W}:${Math.round(H * 0.88)}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=${W}:${H}:(ow-iw)/2:oh-ih:color=0x00000000`,
        '-frames:v', '1', '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', scale === 1 ? '86' : '78', output
    ]);
}

function encode(input, output, [w, h], focus, scale = 1, zoom = 1) {
    // Same 4:5 crop for both halves: full width (or full height), `focus` = where the crop sits vertically (0 top … 1 bottom).
    // `zoom` > 1 cuts a closer 4:5 crop (fine detail such as grain disappears when a whole photo is scaled down).
    const crop = `crop='min(iw,ih*4/5)/${zoom}':'min(ih,iw*5/4)/${zoom}':'(iw-ow)/2':'(ih-oh)*${focus}'`;
    execFileSync('ffmpeg', [
        '-v', 'error', '-y', '-i', input,
        '-vf', `${crop},scale=${w * scale}:${h * scale}:flags=lanczos`,
        '-frames:v', '1', '-c:v', 'libwebp', '-quality', scale === 1 ? '82' : '72', output
    ]);
}

/** Card preview for the guides hub: before and after side by side in one small picture (2x of 202×125). */
const THUMB = { w: 200, h: 250, gap: 4 };
function encodeThumb(before, after, output, focus, zoom = 1, framed = false) {
    if (framed) {
        // The card, whole, on the page's card colour next to the cropped original.
        const left = `crop='min(iw,ih*4/5)':'min(ih,iw*5/4)':'(iw-ow)/2':'(ih-oh)*${focus}',scale=${THUMB.w}:${THUMB.h}:flags=lanczos,pad=${THUMB.w + THUMB.gap}:${THUMB.h}:0:0:color=0x17120f`;
        const right = `scale=${THUMB.w - 16}:${THUMB.h - 16}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=${THUMB.w}:${THUMB.h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
        execFileSync('ffmpeg', [
            '-v', 'error', '-y', '-i', before, '-i', after, '-f', 'lavfi', '-i', `color=0x221b17:s=${THUMB.w}x${THUMB.h}`,
            '-filter_complex', `[0:v]${left}[a];[1:v]${right}[card];[2:v][card]overlay=0:0[b];[a][b]hstack=inputs=2`,
            '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', output
        ]);
        return;
    }
    const half = `crop='min(iw,ih*4/5)/${zoom}':'min(ih,iw*5/4)/${zoom}':'(iw-ow)/2':'(ih-oh)*${focus}',scale=${THUMB.w}:${THUMB.h}:flags=lanczos`;
    execFileSync('ffmpeg', [
        '-v', 'error', '-y', '-i', before, '-i', after,
        '-filter_complex', `[0:v]${half},pad=${THUMB.w + THUMB.gap}:${THUMB.h}:0:0:color=0x17120f[a];[1:v]${half}[b];[a][b]hstack=inputs=2`,
        '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', output
    ]);
}

function main() {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const source = path.resolve(ROOT, process.env.HALATTO_LIBRARY || config.source);
    const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
    if (!fs.existsSync(path.join(source, 'library', 'photos.json'))) {
        console.error(`❌ No photo library at ${source} (set HALATTO_LIBRARY or "source" in build/before-after.json)`);
        process.exit(1);
    }
    const library = new Map(JSON.parse(fs.readFileSync(path.join(source, 'library', 'photos.json'), 'utf8')).photos.map((p) => [p.id, p]));
    const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : {};
    manifest.guides = manifest.guides || {};
    manifest.looks = manifest.looks || {};
    const missing = [];
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.mkdirSync(LOOKS_OUT_DIR, { recursive: true });

    /** Paths of one pair, or null (and a line in `missing`) when the render does not exist yet. */
    function resolvePair(entry, label) {
        const extras = extrasOf(entry);
        if (entry.look && !LOOK_NAMES[entry.look]) throw new Error(`${label}: unknown look "${entry.look}"`);
        if (!entry.look && !extras.length) throw new Error(`${label}: needs a "look" or "extras"`);
        if (entry.before && entry.after) {
            return { before: path.resolve(ROOT, entry.before), after: path.resolve(ROOT, entry.after), credit: entry.credit || 'own photo', rights: 'own' };
        }
        const photo = library.get(entry.photo);
        if (!photo) throw new Error(`${label}: photo "${entry.photo}" is not in ${source}/library/photos.json`);
        if (photo.rights === 'own') throw new Error(`${label}: "${entry.photo}" is a private photo (rights: own); pick a stock one`);
        const before = path.join(source, photo.file);
        // A plain look shares youmarkt's render cache; a look with tools on top is this site's own render.
        const after = extras.length
            ? path.join(SITE_RENDERS_DIR, [entry.look || 'none', ...extras].join('+'), `${entry.photo}.${hasFrame(entry) ? 'png' : 'jpg'}`)
            : path.join(source, 'renders', entry.look, `${entry.photo}.jpg`);
        if (!fs.existsSync(after)) {
            missing.push({
                label,
                item: {
                    ...(entry.look ? { look: `retro.${entry.look}` } : {}),
                    ...(extras.length ? { extras } : {}),
                    ...(entry.date ? { date: entry.date } : {}),
                    input: before,
                    output: after
                }
            });
            return null;
        }
        return { before, after, credit: (photo.note || '').split(' · query')[0], rights: photo.rights };
    }

    function pair(key, entry, kind) {
        const files = resolvePair(entry, key);
        if (!files) return null;
        const focus = entry.focus ?? 0.35;
        const zoom = entry.zoom ?? 1;
        const base = `/img/before-after/${key}`;
        const framed = hasFrame(entry);
        for (const side of ['before', 'after']) {
            if (side === 'after' && framed) {
                encodeContained(files.after, path.join(ROOT, `${base}-after.webp`), SIZES[kind], 1);
                encodeContained(files.after, path.join(ROOT, `${base}-after@2x.webp`), SIZES[kind], 2);
                continue;
            }
            encode(files[side], path.join(ROOT, `${base}-${side}.webp`), SIZES[kind], focus, 1, zoom);
            encode(files[side], path.join(ROOT, `${base}-${side}@2x.webp`), SIZES[kind], focus, 2, zoom);
        }
        if (kind === 'guide') encodeThumb(files.before, files.after, path.join(ROOT, `${base}-thumb.webp`), focus, zoom * (entry.thumb_zoom ?? 1), framed);
        console.log(`✅ ${key}: ${editName(entry)} on ${entry.photo || 'own export'}`);
        const [width, height] = SIZES[kind];
        return {
            look: entry.look || null, look_name: editName(entry), extras: extrasOf(entry),
            photo: entry.photo || null, credit: files.credit, rights: files.rights,
            width, height,
            before: versioned(`${base}-before.webp`), before_2x: versioned(`${base}-before@2x.webp`),
            after: versioned(`${base}-after.webp`), after_2x: versioned(`${base}-after@2x.webp`),
            ...(kind === 'guide' ? { thumb: versioned(`${base}-thumb.webp`), thumb_width: THUMB.w * 2 + THUMB.gap, thumb_height: THUMB.h } : {})
        };
    }

    for (const [slug, entry] of Object.entries(config.guides || {})) {
        if (only && only !== slug) continue;
        const result = pair(slug, entry, 'guide');
        if (result) manifest.guides[slug] = result;
    }
    if (config.home && (!only || only === 'home')) {
        const result = pair('home', config.home, 'home');
        if (result) manifest.home = result;
    }
    if (config.looks && (!only || only === 'looks')) {
        for (const look of Object.keys(LOOK_NAMES)) {
            const photo = config.looks.overrides?.[look] || config.looks.photo;
            const files = resolvePair({ look, photo }, `looks/${look}`);
            if (!files) continue;
            encode(files.after, path.join(LOOKS_OUT_DIR, `${look}.webp`), SIZES.look, config.looks.focus ?? 0.35, 1);
            manifest.looks[look] = { src: versioned(`/img/looks/photo/${look}.webp`), photo, credit: files.credit };
        }
        console.log(`✅ look thumbnails: ${Object.keys(manifest.looks).length} of ${Object.keys(LOOK_NAMES).length}`);
    }

    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`📁 ${path.relative(ROOT, MANIFEST_PATH)}`);
    if (missing.length) {
        fs.writeFileSync(JOB_PATH, `${JSON.stringify({ items: missing.map((m) => m.item) }, null, 2)}\n`);
        console.warn(`\n⚠️  ${missing.length} render(s) missing: ${missing.map((m) => m.label).join(', ')}`);
        console.warn('   Run: npm run before-after:render   (develops them on the iOS simulator, then rebuilds)');
    } else if (fs.existsSync(JOB_PATH)) {
        fs.rmSync(JOB_PATH);
    }
}

main();
