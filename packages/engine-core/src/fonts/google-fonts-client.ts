const GOOGLE_FONTS_CSS2 = 'https://fonts.googleapis.com/css2';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export type FontUrl = {
  url: string;
  weight: string;
};

export function parseCssForUrls(css: string): FontUrl[] {
  const results: FontUrl[] = [];
  const blockRegex = /@font-face\s*\{([^}]+)\}/g;

  let block: RegExpExecArray | null;
  while ((block = blockRegex.exec(css)) !== null) {
    const body = block[1];
    if (!body) continue;
    const urlMatch = body.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
    const weightMatch = body.match(/font-weight:\s*([^;]+);/);
    if (urlMatch && urlMatch[1]) {
      results.push({
        url: urlMatch[1],
        weight: weightMatch?.[1]?.trim() ?? '400',
      });
    }
  }

  return results;
}

export async function validateFamily(family: string): Promise<boolean> {
  const url = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  return res.ok;
}

function isVariableWeight(weight: string): boolean {
  return weight.includes(' ') || weight.includes('..');
}

export type DownloadResult = {
  isVariable: boolean;
  weights?: number[];
  files: Map<string, Buffer>;
  fileNames: string[];
};

export async function downloadFamily(family: string): Promise<DownloadResult> {
  // Try variable font first
  const variableUrl = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}:wght@100..900`;
  const variableRes = await fetch(variableUrl, { headers: { 'User-Agent': USER_AGENT } });

  if (variableRes.ok) {
    const css = await variableRes.text();
    const urls = parseCssForUrls(css);
    // Check if any entry has a variable weight range
    const variableEntry = urls.find((u) => isVariableWeight(u.weight));
    if (variableEntry) {
      const fontRes = await fetch(variableEntry.url);
      const buffer = Buffer.from(await fontRes.arrayBuffer());
      return {
        isVariable: true,
        files: new Map([['variable.woff2', buffer]]),
        fileNames: ['variable.woff2'],
      };
    }
  }

  // Fall back to static weights 400 + 700
  const staticUrl = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}:wght@400;700`;
  const staticRes = await fetch(staticUrl, { headers: { 'User-Agent': USER_AGENT } });

  if (!staticRes.ok) {
    // Some fonts only have a single weight (e.g., Bebas Neue is 400 only)
    const singleUrl = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}`;
    const singleRes = await fetch(singleUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!singleRes.ok) {
      throw new Error(`Failed to fetch font CSS for "${family}"`);
    }
    const css = await singleRes.text();
    const urls = parseCssForUrls(css);
    if (urls.length === 0) throw new Error(`No woff2 URLs found for "${family}"`);
    const first = urls[0]!;
    const fontRes = await fetch(first.url);
    const buffer = Buffer.from(await fontRes.arrayBuffer());
    const weight = first.weight.trim();
    const fileName = `${weight}.woff2`;
    return {
      isVariable: false,
      weights: [parseInt(weight, 10) || 400],
      files: new Map([[fileName, buffer]]),
      fileNames: [fileName],
    };
  }

  const css = await staticRes.text();
  const urls = parseCssForUrls(css);
  const files = new Map<string, Buffer>();
  const weights: number[] = [];
  const fileNames: string[] = [];

  for (const entry of urls) {
    const w = entry.weight.trim();
    const fileName = `${w}.woff2`;
    const fontRes = await fetch(entry.url);
    files.set(fileName, Buffer.from(await fontRes.arrayBuffer()));
    weights.push(parseInt(w, 10));
    fileNames.push(fileName);
  }

  return { isVariable: false, weights, files, fileNames };
}
