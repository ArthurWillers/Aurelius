import assert from "node:assert/strict";
import test from "node:test";
import geometry from "../core/diagrams/geometry.mjs";
import { pathBounds, pathPoints } from "../core/diagrams/svg-path.mjs";
import { validateAccessibleSvg } from "../core/diagrams/registry.mjs";

const nodes = (vertical = false, count = 5) => Array.from({ length: count }, (_, i) => ({ id: String(i), x: vertical ? 0 : i * 180, y: vertical ? i * 100 : 0, width: 120, height: 48 }));
const contains = (outer, inner) => inner.x >= outer.x - 1e-8 && inner.y >= outer.y - 1e-8 && inner.x + inner.width <= outer.x + outer.width + 1e-8 && inner.y + inner.height <= outer.y + outer.height + 1e-8;

test("content bounds retain negative coordinates and apply only the declared padding", () => {
  const content = geometry.union([{ x: -120, y: -48, width: 120, height: 48 }, { x: 180, y: 0, width: 120, height: 48 }]);
  const bounds = geometry.pad(content, geometry.padding);
  assert.equal(bounds.width - content.width, geometry.padding * 2);
  assert.equal(bounds.height - content.height, geometry.padding * 2);
  assert.ok(contains(bounds, content));
});

for (const vertical of [false, true]) test(`routes follow ${vertical ? "vertical" : "horizontal"} flow and keep returns outside nodes`, () => {
  const boxes = nodes(vertical);
  const edges = boxes.slice(1).map((n, i) => ({ from: String(i), to: n.id, label: "aceite" }));
  edges.push({ from: "2", to: "1", tone: "return", label: "pendência" }, { from: "1", to: "0", tone: "return", label: "erro" });
  const routes = geometry.routeEdges(boxes, edges);
  routes.forEach((route) => {
    assert.ok(route.points.length >= 2);
    assert.ok(route.label, "labels are retained");
    assert.doesNotMatch(route.path, /NaN|Infinity/);
    geometry.segments(route.points).forEach((segment) => {
      assert.ok(segment.a.x === segment.b.x || segment.a.y === segment.b.y, "each segment is orthogonal");
      boxes.forEach((node) => {
        const interior = { x: node.x + 0.1, y: node.y + 0.1, width: node.width - 0.2, height: node.height - 0.2 };
        const bounds = geometry.pointsBounds([segment.a, segment.b]);
        assert.ok(!geometry.overlap(interior, bounds), "routes avoid node interiors");
      });
    });
    assert.ok(!boxes.some((node) => geometry.overlap(route.label, node)), "labels avoid nodes");
  });
  const forward = routes[0];
  assert.equal(forward.fromSide, vertical ? "bottom" : "right");
  assert.equal(forward.toSide, vertical ? "top" : "left");
  const localReturn = geometry.pointsBounds(routes.at(-2).points);
  assert.ok(vertical ? localReturn.height < 180 : localReturn.width < 360, "return routes stay near their endpoints");
});

test("parallel connections and self loops use distinct ports and finite bounds", () => {
  const boxes = nodes(false, 2);
  const routes = geometry.routeEdges(boxes, [{ from: "0", to: "1", label: "sim" }, { from: "0", to: "1", label: "não" }, { from: "0", to: "0", label: "repetir" }]);
  assert.notEqual(routes[0].path, routes[1].path);
  assert.ok(!geometry.overlap(routes[0].label, routes[1].label), "parallel labels remain distinct");
  assert.ok(routes[2].points.length >= 4);
  const bounds = geometry.pad(geometry.union([...boxes, ...routes.flatMap((r) => [geometry.pointsBounds(r.points, 10), r.label])]), geometry.padding);
  routes.forEach((route) => assert.ok(contains(bounds, geometry.pointsBounds(route.points, 10))));
});

test("short gaps shorten escape segments instead of entering adjacent nodes", () => {
  const boxes = [{ id: "a", x: 0, y: 0, width: 120, height: 48 }, { id: "b", x: 128, y: 0, width: 120, height: 48 }];
  const [route] = geometry.routeEdges(boxes, [{ from: "a", to: "b" }]);
  assert.deepEqual(route.points, [{ x: 120, y: 24 }, { x: 128, y: 24 }]);
});

test("authored curves place labels on the actual path and retain separate subpaths", () => {
  const source = "M-40 50 C40 -200 120 -200 200 50";
  const points = pathPoints(source), label = geometry.placeLabel(points, "Curva autorada", []);
  assert.ok(label.y < -100, "the label follows the curve, not an inferred straight route");
  assert.ok(contains(geometry.pad(pathBounds(source), 20), label));
  const parts = geometry.segments(pathPoints("M0 0 L10 0 M100 100 L110 100"));
  assert.equal(parts.length, 2);
  assert.equal(parts.reduce((length, segment) => length + segment.length, 0), 20);
  for (const invalid of ["", "L0 0", "M0 0 * 10 10", "M0 0 A10 10 0 2 0 20 20"]) assert.throws(() => pathBounds(invalid));
});

test("wrapping keeps all Unicode text, hard breaks and long tokens", () => {
  const value = "Acompanhamento acadêmico e conclusão 🚀 日本語";
  const lines = geometry.wrapText(value, 100, 12);
  assert.ok(lines.length > 2);
  assert.equal(lines.join("").replace(/\s+/g, ""), value.replace(/\s+/g, ""));
  geometry.wrapText("IdentificadorMuitoLongoSemEspaços", 40, 12).forEach((line) => assert.ok(geometry.textWidth(line, 12) <= 40));
  assert.deepEqual(geometry.wrapText("Linha um\nLinha dois", 200, 12), ["Linha um", "Linha dois"]);
  assert.ok(geometry.textWidth("a\u0301", 12) === geometry.textWidth("a", 12));
});

test("fit preserves the whole diagram at very wide and tall viewport ratios", () => {
  for (const content of [geometry.union(nodes(false, 2)), geometry.union(nodes(false, 40)), geometry.union(nodes(true, 40))]) {
    for (const [width, height] of [[1440, 300], [360, 640], [1920, 1080]]) {
      const bounds = geometry.pad(content, geometry.padding), fit = geometry.fit(bounds, width, height);
      assert.ok(contains({ x: fit[0], y: fit[1], width: fit[2], height: fit[3] }, bounds));
      assert.ok(Math.abs(fit[2] / fit[3] - width / height) < 1e-8);
    }
  }
});

test("authored path bounds include Bézier extrema, relative commands and rotated arcs", () => {
  const quadratic = pathBounds("M0 0 Q50 100 100 0");
  assert.equal(quadratic.width, 100);
  assert.ok(Math.abs(quadratic.height - 50) < 1e-8);
  const cubic = pathBounds("M-50 10 c0 120 100 120 100 0");
  assert.equal(cubic.x, -50); assert.equal(cubic.width, 100);
  assert.ok(Math.abs(cubic.height - 90) < 1e-8);
  assert.ok(pathBounds("M0 0 A50 30 45 1 1 100 0").height > 30);
  assert.deepEqual(pathBounds("M0 0 A30 20 0 01100 0"), pathBounds("M0 0 A30 20 0 0 1 100 0"));
  assert.ok(pathBounds("M10 20 h30 v40 h-30 z").height >= 40);
  assert.throws(() => pathBounds("M0 0 Q10"));
});

test("SVG validation rejects malformed, nonfinite and nonpositive viewBoxes", () => {
  const svg = (box) => `<svg viewBox="${box}" role="img" aria-labelledby="t d"><title id="t">Title</title><desc id="d">Description</desc></svg>`;
  for (const box of ["0 0 0 10", "0 0 -10 10", "0 0 Infinity 10", "0 0 10", "arbitrary"])
    assert.throws(() => validateAccessibleSvg(svg(box), { svgSource: "test.svg" }), /viewBox/);
  assert.match(validateAccessibleSvg(svg("-10 -20 100 50"), { svgSource: "test.svg" }), /viewBox="-10 -20 100 50"/);
});
