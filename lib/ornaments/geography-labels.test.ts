import assert from "node:assert/strict";
import test from "node:test";
import { createGeographyLabelLayout, geographyLabelConnector, placeGeographyLabels, projectGeographyLabels } from "./geography-labels";

test("floating labels stay in the viewport, avoid the controls and do not overlap", () => {
  for (const [width, height] of [[950, 648], [480, 560], [375, 380], [560, 504]]) {
    const names = ["United Kingdom", "Germany", "Czechia", "France", "Italy", "China"];
    const pins = names.map((name, index) => ({ code: String(index), name, x: width * .45 + index * 3, y: height * .45 + index * 5 }));
    const result = placeGeographyLabels(pins, width, height);
    assert.equal(result.length, pins.length);
    for (const label of result) {
      assert.ok(label.left >= 12 && label.left + label.width <= width - 12);
      assert.equal(label.height, 28);
      assert.ok(label.top >= 12 && label.top + label.height <= height - 76);
      for (const other of result) {
        if (label.code === other.code) continue;
        assert.ok(label.left + label.width <= other.left || other.left + other.width <= label.left ||
          label.top + label.height <= other.top || other.top + other.height <= label.top,
        `${width}px: ${label.name} overlaps ${other.name}`);
      }
    }
    assert.deepEqual(result, placeGeographyLabels(pins, width, height));
  }
});

test("connectors attach to the facing top, bottom, left or right edge", () => {
  const label = {code:"1",name:"France",left:100,top:100,width:120,height:28};
  for (const [x,y,endX,endY] of [
    [160,50,160,100], [160,200,160,128], [50,114,100,114], [300,114,220,114],
  ]) {
    assert.deepEqual(geographyLabelConnector({...label,x,y}),{x1:x,y1:y,x2:endX,y2:endY});
  }
});

test("diagonal connectors stop outside the text and clear rounded label corners", () => {
  const label = {code:"1",name:"France",left:100,top:100,width:120,height:28};
  for (const [x,y] of [[20,20],[300,20],[20,220],[300,220],[0,0]]) {
    const line = geographyLabelConnector({...label,x,y})!;
    assert.ok(line.x2 >= 100 && line.x2 <= 220 && line.y2 >= 100 && line.y2 <= 128);
    assert.ok(line.x2===100 || line.x2===220 || line.y2===100 || line.y2===128);
    if (line.y2===100 || line.y2===128) assert.ok(line.x2 >= 104 && line.x2 <= 216);
    else assert.ok(line.y2 >= 104 && line.y2 <= 124);
  }
});

test("a pin inside a label does not produce a reversed or zero-length connector", () => {
  assert.equal(geographyLabelConnector({code:"1",name:"France",left:100,top:100,width:120,height:28,x:160,y:114}),null);
});

test("empty and edge-positioned pin selections are handled", () => {
  assert.deepEqual(placeGeographyLabels([], 375, 380), []);
  for (const [x, y] of [[0, 0], [375, 380], [1, 200], [374, 1]]) {
    const [label] = placeGeographyLabels([{code:"1",name:"United Kingdom",x,y}],375,380);
    assert.ok(label.left >= 12 && label.left + label.width <= 363);
    assert.ok(label.top >= 12 && label.top + label.height <= 304);
  }
});

test("labels and connector endpoints translate exactly with pins throughout a long pan", () => {
  const pins = ["United Kingdom", "Germany", "France", "Czechia", "Italy", "China"].map((name, i) =>
    ({ code: String(i), name, x: 150 + i * 11, y: 90 + i * 16 }));
  const layout = createGeographyLabelLayout(pins, 375, 380);
  const initial = projectGeographyLabels(pins, layout);
  for (let dx = -450; dx <= 450; dx += 5) {
    const dy = dx * .3;
    const moved = projectGeographyLabels(pins.map(pin => ({ ...pin, x: pin.x + dx, y: pin.y + dy })), layout);
    moved.forEach((label, i) => {
      assert.ok(Math.abs(label.left - initial[i].left - dx) < 1e-9);
      assert.ok(Math.abs(label.top - initial[i].top - dy) < 1e-9);
      const before = geographyLabelConnector(initial[i])!;
      const after = geographyLabelConnector(label)!;
      assert.ok(Math.abs(after.x2 - before.x2 - dx) < 1e-9);
      assert.ok(Math.abs(after.y2 - before.y2 - dy) < 1e-9);
    });
  }
});

test("rotating, reordering, hiding and revealing pins does not change their label offsets", () => {
  const pins = [
    {code:"a",name:"France",x:200,y:100},
    {code:"b",name:"Germany",x:205,y:110},
    {code:"c",name:"Italy",x:220,y:120},
  ];
  const layout = createGeographyLabelLayout(pins, 800, 580);
  for (let step = 0; step < 200; step++) {
    const moved = pins.map((pin, i) => ({
      ...pin, x: 400 + Math.sin(step / 20 + i) * 300, y: 290 + Math.cos(step / 17 + i) * 200,
    })).filter((_, i) => step % 3 !== i).reverse();
    for (const label of projectGeographyLabels(moved, layout)) {
      assert.ok(Math.abs(label.left - label.x - layout.get(label.code)!.dx) < 1e-9);
      assert.ok(Math.abs(label.top - label.y - layout.get(label.code)!.dy) < 1e-9);
    }
  }
  assert.deepEqual(projectGeographyLabels(pins, layout), projectGeographyLabels(pins, createGeographyLabelLayout(pins, 800, 580)));
  assert.deepEqual(projectGeographyLabels([{code:"unknown",name:"Unknown",x:0,y:0}], layout), []);
});
