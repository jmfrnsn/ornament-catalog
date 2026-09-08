import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogMapStyle,
  transformCatalogMapRequest,
} from "./map-style";

const TOKEN = "pk.test-token";

function withMapboxToken<T>(run: () => T): T {
  const previousAccess = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const previousAlias = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = TOKEN;
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  try {
    return run();
  } finally {
    if (previousAccess === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = previousAccess;
    }
    if (previousAlias === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = previousAlias;
    }
  }
}

function withoutMapboxToken<T>(run: () => T): T {
  const previousAccess = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const previousAlias = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  try {
    return run();
  } finally {
    if (previousAccess === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = previousAccess;
    }
    if (previousAlias === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = previousAlias;
    }
  }
}

test("catalogMapStyle uses OpenFreeMap without a token", () => {
  withoutMapboxToken(() => {
    assert.equal(
      catalogMapStyle(),
      "https://tiles.openfreemap.org/styles/positron",
    );
  });
});

test("catalogMapStyle uses Mapbox Light when a token is set", () => {
  withMapboxToken(() => {
    assert.equal(
      catalogMapStyle(),
      `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${encodeURIComponent(TOKEN)}`,
    );
  });
});

test("transformCatalogMapRequest leaves OpenFreeMap URLs alone", () => {
  withMapboxToken(() => {
    const url = "https://tiles.openfreemap.org/tiles/v3/1/2/3.pbf";
    assert.deepEqual(transformCatalogMapRequest(url, "Tile"), { url });
  });
});

test("transformCatalogMapRequest is a no-op without a token", () => {
  withoutMapboxToken(() => {
    const url = "mapbox://sprites/mapbox/light-v11.json";
    assert.deepEqual(transformCatalogMapRequest(url, "SpriteJSON"), { url });
  });
});

test("transformCatalogMapRequest rewrites Mapbox sprites, fonts, and sources", () => {
  withMapboxToken(() => {
    const tokenQ = `access_token=${encodeURIComponent(TOKEN)}`;
    assert.equal(
      transformCatalogMapRequest(
        "mapbox://sprites/mapbox/light-v11.json",
        "SpriteJSON",
      ).url,
      `https://api.mapbox.com/styles/v1/mapbox/light-v11/sprite.json?${tokenQ}`,
    );
    assert.equal(
      transformCatalogMapRequest(
        "mapbox://sprites/mapbox/light-v11@2x.png",
        "SpriteImage",
      ).url,
      `https://api.mapbox.com/styles/v1/mapbox/light-v11/sprite@2x.png?${tokenQ}`,
    );
    assert.equal(
      transformCatalogMapRequest(
        "mapbox://fonts/mapbox/Open Sans Regular/0-255.pbf",
        "Glyphs",
      ).url,
      `https://api.mapbox.com/fonts/v1/mapbox/Open Sans Regular/0-255.pbf?${tokenQ}`,
    );
    assert.equal(
      transformCatalogMapRequest(
        "mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2",
        "Source",
      ).url,
      `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2.json?secure&${tokenQ}`,
    );
  });
});

test("transformCatalogMapRequest appends a token to Mapbox HTTPS URLs", () => {
  withMapboxToken(() => {
    assert.equal(
      transformCatalogMapRequest(
        "https://api.mapbox.com/styles/v1/mapbox/light-v11/sprite.json",
        "SpriteJSON",
      ).url,
      `https://api.mapbox.com/styles/v1/mapbox/light-v11/sprite.json?access_token=${encodeURIComponent(TOKEN)}`,
    );
  });
});
