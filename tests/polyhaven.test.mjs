// Poly Haven: the per-type asset lists are ranked locally; get_resource turns one asset's /info
// and /files into web-sized download links. Samples trimmed from api.polyhaven.com.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { polyhaven } from "../dist/sources/polyhaven.js";
import { mockFetch } from "./helpers.mjs";

const API = "https://api.polyhaven.com";
const thumb = (id, v) =>
  `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256&format=webp&v=${v}`;
const dl = (path) => `https://dl.polyhaven.org/file/ph-assets/${path}`;

const HDRIS = {
  aarfontein_dawn_2: {
    type: 0,
    name: "Aarfontein Dawn 2",
    categories: ["outdoor", "nature", "natural light", "low contrast", "sunrise-sunset"],
    category: "Desert & Arid/Karoo & Scrubland/Rocky Outcrops",
    tags: ["grass", "hilltop", "arid landscape", "blue hour", "mountain"],
    description:
      "Free, unclipped 24K HDRI of a rocky grassland at dawn: soft pre-sunrise glow, pale blue sky with pink clouds.",
    authors: { "Dario Barresi": "All" },
    max_resolution: [24576, 12288],
    download_count: 1294,
    thumbnail_url: thumb("aarfontein_dawn_2", "9f3e0257"),
  },
  kloofendal_48d_partly_cloudy_puresky: {
    type: 0,
    name: "Kloofendal 48d Partly Cloudy (Pure Sky)",
    categories: ["outdoor", "skies", "nature", "midday", "partly cloudy", "pure skies"],
    category: "Pure Skies",
    tags: ["pure skies"],
    description:
      "Free 16K unclipped HDRI - midday partly-cloudy pure sky with bright sun, high-contrast natural light and crisp clouds.",
    authors: { "Greg Zaal": "Original", "Jarod Guest": "Sky edits" },
    max_resolution: [16384, 8192],
    download_count: 874788,
    thumbnail_url: thumb("kloofendal_48d_partly_cloudy_puresky", "691edf4f"),
  },
  "not a tool id": { type: 0, name: "Left out: the id has spaces" },
};
const TEXTURES = {
  brick_floor_003: {
    type: 1,
    name: "Brick Floor 003",
    categories: ["floor", "brick", "man made", "outdoor", "indoor", "clean", "wall"],
    category: "Stone/Cobblestone & Paving/Cut Setts & Pavers",
    tags: ["brown", "floor", "pavement"],
    description:
      "Free 8K texture: clean brown brick floor with rectangular stones, rough chiseled surface, deep mortar joints and subtle edge wear.",
    authors: { "Rob Tuytel": "Processing", "Dimitrios Savva": "Photography" },
    max_resolution: [8192, 8192],
    download_count: 46470,
    thumbnail_url: thumb("brick_floor_003", "d8e356ba"),
  },
  nameless_texture: { type: 1 }, // no name: left out
};
const MODELS = {
  ceramic_vase_03: {
    type: 2,
    name: "Ceramic Vase 03",
    categories: ["containers", "decorative", "vases"],
    category: "Decor & Art/Vases & Vessels/Ceramic Vases",
    tags: ["clay", "pot", "decor", "painted", "vase", "tall", "modern"],
    description: "Free 8K model - tall modern painted ceramic vase: rectangular clay pot.",
    authors: { "James Ray Cock": "All" },
    max_resolution: [8192, 8192],
    polycount: 2784,
    download_count: 7599,
    thumbnail_url: thumb("ceramic_vase_03", "d977a505"),
  },
};

const file = (path, size) => ({ url: dl(path), size, md5: "c69498687e876bf68d2a8b8a62234eb9" });
const HDRI = "HDRIs/hdr";
const FILES = {
  kloofendal_48d_partly_cloudy_puresky: {
    hdri: {
      "1k": {
        hdr: file(`${HDRI}/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr`, 1435119),
        exr: file("HDRIs/exr/1k/kloofendal_48d_partly_cloudy_puresky_1k.exr", 5498182),
      },
      "2k": { hdr: file(`${HDRI}/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr`, 5451493) },
      "4k": { hdr: file(`${HDRI}/4k/kloofendal_48d_partly_cloudy_puresky_4k.hdr`, 20674857) },
      "8k": { hdr: file(`${HDRI}/8k/kloofendal_48d_partly_cloudy_puresky_8k.hdr`, 74844926) },
    },
    tonemapped: file(
      "HDRIs/extra/Tonemapped%20JPG/kloofendal_48d_partly_cloudy_puresky.jpg",
      22162150,
    ),
  },
  brick_floor_003: {
    Diffuse: {
      "1k": {
        jpg: file("Textures/jpg/1k/brick_floor_003/brick_floor_003_diffuse_1k.jpg", 199347),
        png: file("Textures/png/1k/brick_floor_003/brick_floor_003_diffuse_1k.png", 1607690),
      },
      "2k": { jpg: file("Textures/jpg/2k/brick_floor_003/brick_floor_003_diffuse_2k.jpg", 782831) },
      "4k": {
        jpg: file("Textures/jpg/4k/brick_floor_003/brick_floor_003_diffuse_4k.jpg", 2940999),
      },
    },
    nor_gl: {
      "1k": { jpg: file("Textures/jpg/1k/brick_floor_003/brick_floor_003_nor_gl_1k.jpg", 253840) },
      "2k": { jpg: file("Textures/jpg/2k/brick_floor_003/brick_floor_003_nor_gl_2k.jpg", 995955) },
    },
    Rough: {
      "1k": { png: file("Textures/png/1k/brick_floor_003/brick_floor_003_rough_1k.png", 604426) },
    },
    gltf: {
      "1k": { gltf: file("Textures/gltf/1k/brick_floor_003/brick_floor_003_1k.gltf", 2731) },
    },
    blend: {
      "1k": { blend: file("Textures/blend/1k/brick_floor_003/brick_floor_003_1k.blend", 274131) },
    },
  },
  ceramic_vase_03: {
    gltf: {
      "1k": {
        gltf: {
          ...file("Models/gltf/1k/ceramic_vase_03/ceramic_vase_03_1k.gltf", 2690),
          include: {
            "textures/ceramic_vase_03_rough_1k.jpg": file(
              "Models/jpg/1k/ceramic_vase_03/ceramic_vase_03_rough_1k.jpg",
              154214,
            ),
            "ceramic_vase_03.bin": file(
              "Models/gltf/8k/ceramic_vase_03/ceramic_vase_03.bin",
              299232,
            ),
          },
        },
      },
      "2k": {
        gltf: {
          ...file("Models/gltf/2k/ceramic_vase_03/ceramic_vase_03_2k.gltf", 2690),
          include: {
            "textures/ceramic_vase_03_diff_2k.jpg": file(
              "Models/jpg/2k/ceramic_vase_03/ceramic_vase_03_diff_2k.jpg",
              454987,
            ),
            "plain-http.jpg": { url: "http://dl.polyhaven.org/x.jpg", size: 1 }, // never offered
          },
        },
      },
      "4k": { gltf: file("Models/gltf/4k/ceramic_vase_03/ceramic_vase_03_4k.gltf", 2690) },
    },
    fbx: { "1k": { fbx: file("Models/fbx/1k/ceramic_vase_03/ceramic_vase_03_1k.fbx", 352316) } },
    Diffuse: {
      "1k": { jpg: file("Models/jpg/1k/ceramic_vase_03/ceramic_vase_03_diff_1k.jpg", 1) },
    },
  },
};
const LISTS = { hdris: HDRIS, textures: TEXTURES, models: MODELS };
const INFO = { ...HDRIS, ...TEXTURES, ...MODELS }; // /info/<id> has the same fields as /assets

function serve(url) {
  const u = new URL(url);
  if (u.pathname === "/assets") return { body: JSON.stringify(LISTS[u.searchParams.get("type")]) };
  const [, kind, id] = u.pathname.split("/");
  if (id === "broken_api") return { status: 500 };
  const table = kind === "info" ? INFO : kind === "files" ? FILES : {};
  return Object.hasOwn(table, id)
    ? { body: JSON.stringify(table[id]) }
    : { status: 404, body: '{"error":"Asset not found"}' };
}

const ids = (rows) => rows.map((r) => r.id);

describe("polyhaven", () => {
  it("is a heavy, credited CC0 asset source without inline code", () => {
    assert.equal(polyhaven.heavy, true);
    assert.equal(polyhaven.hasInlineCode, false);
    assert.deepEqual(polyhaven.stack, ["assets", "3d"]);
    assert.match(polyhaven.idFormat, /asset slug/);
  });

  it("downloads only the list a type search needs, and none for an unknown type", async () => {
    const calls = mockFetch(serve);
    assert.deepEqual(ids(await polyhaven.search({ category: "Textures" })), ["brick_floor_003"]);
    assert.deepEqual(await polyhaven.search({ category: "materials" }), []);
    assert.deepEqual(calls, [`${API}/assets?type=textures`]);
  });

  it("ranks every list by downloads and matches names, tags, categories and descriptions", async () => {
    const calls = mockFetch(serve);
    const all = await polyhaven.search({});
    assert.deepEqual(
      all.map((r) => [r.id, r.category]),
      [
        ["kloofendal_48d_partly_cloudy_puresky", "hdris"],
        ["brick_floor_003", "textures"],
        ["ceramic_vase_03", "models"],
        ["aarfontein_dawn_2", "hdris"],
      ],
    );
    assert.deepEqual(all[2], {
      source: "polyhaven",
      id: "ceramic_vase_03",
      title: "Ceramic Vase 03",
      description: MODELS.ceramic_vase_03.description,
      category: "models",
      url: "https://polyhaven.com/a/ceramic_vase_03",
      image: thumb("ceramic_vase_03", "d977a505"),
      tags: MODELS.ceramic_vase_03.tags,
    });
    assert.deepEqual(ids(await polyhaven.search({ query: "bricks" })), ["brick_floor_003"]);
    assert.deepEqual(ids(await polyhaven.search({ query: "sunrise" })), ["aarfontein_dawn_2"]);
    assert.deepEqual(ids(await polyhaven.search({ query: "mortar" })), ["brick_floor_003"]);
    assert.deepEqual(ids(await polyhaven.search({ query: "sky pure" })), [
      "kloofendal_48d_partly_cloudy_puresky",
    ]);
    assert.deepEqual(ids(await polyhaven.search({ query: "vase", category: "hdris" })), []);
    assert.equal((await polyhaven.search({ limit: 1 })).length, 1);
    // The textures list is still memoized from the previous test; each list is read once.
    assert.deepEqual(calls.sort(), [`${API}/assets?type=hdris`, `${API}/assets?type=models`]);
  });

  it("lists the three asset types without a request", async () => {
    const calls = mockFetch(serve);
    assert.deepEqual(await polyhaven.listCategories(), [
      { id: "hdris", label: "HDRIs" },
      { id: "textures", label: "Textures" },
      { id: "models", label: "Models" },
    ]);
    assert.deepEqual(calls, []);
  });

  it("offers an HDRI as 1k-4k .hdr files, with its authors, license and credit", async () => {
    const id = "kloofendal_48d_partly_cloudy_puresky";
    const calls = mockFetch(serve);
    const d = await polyhaven.getResource(id);
    assert.deepEqual(calls, [`${API}/info/${id}`, `${API}/files/${id}`]);
    assert.deepEqual(d.downloads, [
      { label: "HDRI 1k .hdr (1.4 MB)", url: dl(`${HDRI}/1k/${id}_1k.hdr`) },
      { label: "HDRI 2k .hdr (5.5 MB)", url: dl(`${HDRI}/2k/${id}_2k.hdr`) },
      { label: "HDRI 4k .hdr (20.7 MB)", url: dl(`${HDRI}/4k/${id}_4k.hdr`) },
    ]);
    assert.equal(d.title, "Kloofendal 48d Partly Cloudy (Pure Sky)");
    assert.equal(d.category, "hdris");
    assert.equal(d.image, thumb(id, "691edf4f"));
    assert.equal(d.author, "Greg Zaal (Original), Jarod Guest (Sky edits)");
    assert.equal(d.license, "CC0 (Poly Haven)");
    assert.equal(d.code, undefined);
    assert.deepEqual(d.extra, {
      category: "Pure Skies",
      categories: HDRIS[id].categories,
      maxResolution: [16384, 8192],
      polycount: undefined,
      credit: `Powered by Poly Haven: https://polyhaven.com/a/${id}`,
    });
  });

  it("offers a texture's maps at 1k and 2k as JPG, or PNG when there is no JPG", async () => {
    mockFetch(serve);
    const d = await polyhaven.getResource("brick_floor_003");
    const tex = (f) => dl(`Textures/${f}`);
    assert.deepEqual(d.downloads, [
      {
        label: "Diffuse 1k JPG (199 KB)",
        url: tex("jpg/1k/brick_floor_003/brick_floor_003_diffuse_1k.jpg"),
      },
      {
        label: "Diffuse 2k JPG (783 KB)",
        url: tex("jpg/2k/brick_floor_003/brick_floor_003_diffuse_2k.jpg"),
      },
      {
        label: "nor_gl 1k JPG (254 KB)",
        url: tex("jpg/1k/brick_floor_003/brick_floor_003_nor_gl_1k.jpg"),
      },
      {
        label: "nor_gl 2k JPG (996 KB)",
        url: tex("jpg/2k/brick_floor_003/brick_floor_003_nor_gl_2k.jpg"),
      },
      {
        label: "Rough 1k PNG (604 KB)",
        url: tex("png/1k/brick_floor_003/brick_floor_003_rough_1k.png"),
      },
    ]);
    assert.equal(d.author, "Rob Tuytel (Processing), Dimitrios Savva (Photography)");
  });

  it("offers a model as 1k and 2k glTF plus the HTTPS files each .gltf loads", async () => {
    mockFetch(serve);
    const d = await polyhaven.getResource("ceramic_vase_03");
    assert.deepEqual(
      d.downloads.map((x) => x.label),
      [
        "glTF 1k (3 KB)",
        "glTF 1k: textures/ceramic_vase_03_rough_1k.jpg (154 KB)",
        "glTF 1k: ceramic_vase_03.bin (299 KB)",
        "glTF 2k (3 KB)",
        "glTF 2k: textures/ceramic_vase_03_diff_2k.jpg (455 KB)",
      ],
    );
    assert.equal(d.downloads[0].url, dl("Models/gltf/1k/ceramic_vase_03/ceramic_vase_03_1k.gltf"));
    assert.equal(d.downloads[2].url, dl("Models/gltf/8k/ceramic_vase_03/ceramic_vase_03.bin"));
    assert.equal(d.author, "James Ray Cock");
    assert.equal(d.extra.polycount, 2784);
  });

  it("returns null for an unknown asset and surfaces other HTTP errors", async () => {
    const calls = mockFetch(serve);
    assert.equal(await polyhaven.getResource("no_such_asset"), null);
    assert.equal(await polyhaven.getResource("kind/slug"), null);
    assert.ok(calls.includes(`${API}/info/kind%2Fslug`)); // the id stays one path segment
    await assert.rejects(polyhaven.getResource("broken_api"), /HTTP 500/);
  });
});
