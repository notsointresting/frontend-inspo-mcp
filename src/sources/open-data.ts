// Open-data APIs (3D assets, textures, web-platform Baseline data).
// Every adapter in this array is registered by sources/index.ts.
// Openverse was evaluated and left out: api.openverse.org/robots.txt disallows /v1/images/
// for every user agent, and this project uses no endpoint that robots.txt disallows.
import type { SourceAdapter } from "../lib/types.js";
import { ambientcg } from "./ambientcg.js";
import { polyhaven } from "./polyhaven.js";
import { webfeatures } from "./webfeatures.js";

export const openDataSources: SourceAdapter[] = [polyhaven, ambientcg, webfeatures];
