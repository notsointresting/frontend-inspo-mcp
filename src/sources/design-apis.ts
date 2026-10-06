// Design-data JSON APIs (fonts, gradients). Every adapter in this array is registered by
// sources/index.ts, so adding one here is all it takes to expose it.
// Iconify was evaluated and left out: api.iconify.design/robots.txt (and that of its backup
// hosts) disallows "/" for every user agent except Googlebot, and this project uses no
// endpoint that robots.txt disallows.
import type { SourceAdapter } from "../lib/types.js";
import { fontsource } from "./fontsource.js";
import { uigradients } from "./uigradients.js";

export const designApiSources: SourceAdapter[] = [fontsource, uigradients];
