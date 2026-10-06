// ambientCG: search runs on the API v2 full_json endpoint; get_resource asks for one asset with
// its downloadData. Samples trimmed from ambientcg.com/api/v2.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ambientcg } from "../dist/sources/ambientcg.js";
import { mockFetch } from "./helpers.mjs";

const API = "https://ambientcg.com/api/v2";
const thumb = (id) =>
  `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-PNG/${id}.png`;
const get = (file) => `https://ambientcg.com/get?file=${file}`;

const asset = (assetId, fields) => ({
  assetId,
  releaseDate: "2024-11-22 12:00:00",
  dataType: "Material",
  creationMethod: "PBRPhotogrammetry",
  category: null,
  downloadCount: 70775,
  dataTypeName: "Material",
  dataTypeDescription: "A photo texture with PBR maps.",
  creationMethodName: "Height field photogrammetry",
  customDisplayName: "",
  description: "",
  shortLink: `https://ambientcg.com/a/${assetId}`,
  downloadFolders: null,
  previewType: "Default",
  maps: ["color", "displacement", "normal", "roughness", "ambient-occlusion"],
  hasUsd: false,
  previewImage: {
    "64-PNG": `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/64-PNG/${assetId}.png`,
    "256-PNG": thumb(assetId),
  },
  ...fields,
});

const BRICKS097 = asset("Bricks097", {
  displayName: "Bricks 097",
  displayCategory: "Bricks",
  tags: ["97", "brick", "bricks", "brown", "damaged", "old", "red", "wall", "bricks097"],
});
const BRICKS060 = asset("Bricks060", {
  displayName: "Bricks 060",
  displayCategory: "Bricks",
  tags: ["60", "brick", "bricks", "bright", "light", "wall", "white"],
});
const reply = (foundAssets) => ({
  searchQuery: { queryString: "brick wall", sort: "Popular", limit: 2, offset: 0 },
  numberOfResults: foundAssets.length,
  foundAssets,
});
const download = (attribute, filetype, size, id = "PavingStones036") => ({
  fullDownloadPath: get(`${id}_${attribute}.${filetype}`),
  downloadLink: get(`${id}_${attribute}.${filetype}`),
  fileName: `${id}_${attribute}.${filetype}`,
  size,
  filetype,
  attribute,
  zipContent: [],
});
const PAVING = asset("PavingStones036", {
  releaseDate: "2018-11-28 00:00:00",
  displayName: "Paving Stones 036",
  displayCategory: "Paving Stones",
  tags: ["36", "dark", "moss", "parking", "paving", "stone", "stones"],
  downloadFolders: {
    default: {
      title: "default",
      downloadFiletypeCategories: {
        zip: {
          title: "zip",
          downloads: [
            download("1K-JPG", "zip", 9354813),
            download("2K-JPG", "zip", 33823270),
            download("8K-PNG", "zip", 880186360),
            { ...download("4K-JPG", "zip", 1), downloadLink: "http://ambientcg.com/x.zip" },
          ],
        },
      },
    },
  },
});
const SUBSTANCE = asset("TilesSubstance018", {
  dataType: "Substance",
  dataTypeName: "Substance",
  displayName: "Tiles Substance 018",
  displayCategory: "Tiles Substance",
  tags: ["018", "18", "brick", "tile", "tiles", "tilessubstance018"],
  maps: [],
  downloadFolders: {
    default: {
      downloadFiletypeCategories: {
        sbsar: {
          downloads: [
            download("COMPILED-XL", "sbsar", 461170194, "TilesSubstance018"),
            download("COMPILED", "sbsar", 7649860, "TilesSubstance018"),
          ],
        },
      },
    },
  },
});
const CATEGORIES = [
  {
    categoryName: "Tiles",
    categoryDisplayName: "Tiles",
    thumbnailAssetId: null,
    defaultDataTypeId: "Material",
    numberOfAssets: 164,
  },
  {
    categoryName: "DaySkyHDRI",
    categoryDisplayName: "Day Sky HDRI",
    thumbnailAssetId: null,
    defaultDataTypeId: "HDRI",
    numberOfAssets: 142,
  },
  { categoryName: "Bad?Name", categoryDisplayName: "Left out", numberOfAssets: 1 },
];

function serve(url) {
  if (url === `${API}/categories_json`) return { body: JSON.stringify(CATEGORIES) };
  const p = new URL(url).searchParams;
  const id = p.get("id");
  if (id !== null) {
    const found = [PAVING, SUBSTANCE].filter((a) => a.assetId.toLowerCase() === id.toLowerCase());
    return { body: JSON.stringify(reply(found)) }; // unknown ids are ignored, not an error
  }
  if (p.get("q") === "nothing") return { body: JSON.stringify(reply([])) };
  return { body: JSON.stringify(reply([BRICKS097, BRICKS060, asset("bad id", {})])) };
}

describe("ambientcg", () => {
  it("is a light CC0 asset source without inline code", () => {
    assert.equal(ambientcg.heavy, undefined);
    assert.equal(ambientcg.hasInlineCode, false);
    assert.deepEqual(ambientcg.stack, ["assets", "3d"]);
  });

  it("searches on the server, most popular first, and maps each asset", async () => {
    const calls = mockFetch(serve);
    const res = await ambientcg.search({ query: " brick wall ", limit: 2 });
    assert.deepEqual(calls, [`${API}/full_json?q=brick+wall&sort=Popular&limit=2`]);
    assert.deepEqual(res[0], {
      source: "ambientcg",
      id: "Bricks097",
      title: "Bricks 097",
      description: "Material, Height field photogrammetry",
      category: "Bricks",
      url: "https://ambientcg.com/a/Bricks097",
      image: thumb("Bricks097"),
      tags: ["brick", "bricks", "brown", "damaged", "old", "red", "wall"], // no "97", "bricks097"
    });
    assert.deepEqual(
      res.map((r) => r.id),
      ["Bricks097", "Bricks060"],
    );
  });

  it("filters by category, leaves out invalid ids and builds plain listing URLs", async () => {
    const calls = mockFetch(serve);
    const res = await ambientcg.search({ category: "DaySkyHDRI" });
    assert.deepEqual(
      res.map((r) => r.id),
      ["Bricks097", "Bricks060"], // "bad id" is not a valid tool id
    );
    assert.equal((await ambientcg.search({ limit: 500 })).length, 2);
    assert.deepEqual(await ambientcg.search({ query: "nothing" }), []);
    assert.deepEqual(calls, [
      `${API}/full_json?category=DaySkyHDRI&sort=Popular&limit=20`,
      `${API}/full_json?sort=Popular&limit=100`,
      `${API}/full_json?q=nothing&sort=Popular&limit=20`,
    ]);
  });

  it("lists the asset categories with their counts", async () => {
    mockFetch(serve);
    assert.deepEqual(await ambientcg.listCategories(), [
      { id: "Tiles", label: "Tiles", count: 164 },
      { id: "DaySkyHDRI", label: "Day Sky HDRI", count: 142 },
    ]);
  });

  it("returns an asset's HTTPS downloads with sizes, its license and credit text", async () => {
    const calls = mockFetch(serve);
    const d = await ambientcg.getResource("PavingStones036");
    assert.deepEqual(calls, [`${API}/full_json?id=PavingStones036&include=downloadData`]);
    assert.deepEqual(d.downloads, [
      { label: "1K-JPG zip (9.4 MB)", url: get("PavingStones036_1K-JPG.zip") },
      { label: "2K-JPG zip (33.8 MB)", url: get("PavingStones036_2K-JPG.zip") },
      { label: "8K-PNG zip (880.2 MB)", url: get("PavingStones036_8K-PNG.zip") },
    ]);
    assert.equal(d.title, "Paving Stones 036");
    assert.equal(d.image, thumb("PavingStones036"));
    assert.equal(d.license, "CC0 (ambientCG)");
    assert.equal(d.code, undefined);
    assert.deepEqual(d.extra, {
      dataType: "Material",
      creationMethod: "Height field photogrammetry",
      maps: ["color", "displacement", "normal", "roughness", "ambient-occlusion"],
      releaseDate: "2018-11-28 00:00:00",
      credit:
        "Created using Paving Stones 036 from ambientCG.com, licensed under the Creative Commons CC0 1.0 Universal License.",
    });
  });

  it("reads Substance downloads and ignores case in ids", async () => {
    mockFetch(serve);
    const d = await ambientcg.getResource("tilessubstance018");
    assert.equal(d.id, "TilesSubstance018");
    assert.deepEqual(
      d.downloads.map((x) => x.label),
      ["COMPILED-XL sbsar (461.2 MB)", "COMPILED sbsar (7.6 MB)"],
    );
    assert.deepEqual(d.tags, ["brick", "tile", "tiles"]);
  });

  it("returns null for an id the API does not know", async () => {
    mockFetch(serve);
    assert.equal(await ambientcg.getResource("NoSuchAsset999"), null);
  });
});
