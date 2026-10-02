import geometry from "./geometry.mjs";

// Bounds of authored Canvas paths, including relative commands, Bézier extrema
// and rotated elliptical arcs. Geometry is never translated independently of
// the nodes it connects.
function pathGeometry(source, sample) {
  const tokenPattern = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
  const text = String(source), tokens = text.match(tokenPattern) || [];
  if (!tokens.length || tokens[0].toUpperCase() !== "M" || text.replace(tokenPattern, "").replace(/[\s,]/g, "")) throw new Error("Path SVG precisa de comandos e coordenadas válidos, começando com M.");
  const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
  const points = [];
  const samples = [], resolution = 24;
  let x = 0, y = 0, origin = [0, 0], command, previous, control, index = 0;
  const add = (px, py) => points.push({ x: px, y: py });
  const curve = (a, b, c, d) => {
    const evaluate = (t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
    const aa = -a + 3 * b - 3 * c + d, bb = 2 * (a - 2 * b + c), cc = b - a;
    const discriminant = bb * bb - 4 * aa * cc;
    const roots = Math.abs(aa) < 1e-12 ? (Math.abs(bb) < 1e-12 ? [] : [-cc / bb]) : discriminant < 0 ? [] : [(-bb + Math.sqrt(discriminant)) / (2 * aa), (-bb - Math.sqrt(discriminant)) / (2 * aa)];
    return roots.filter((t) => t > 0 && t < 1).map(evaluate);
  };
  while (index < tokens.length) {
    if (/^[a-z]$/i.test(tokens[index])) command = tokens[index++];
    if (!command) throw new Error("Path SVG precisa começar com um comando.");
    const upper = command.toUpperCase(), relative = command !== upper;
    if (upper === "Z") { [x, y] = origin; add(x, y); if (sample) samples.push({ x, y }); previous = upper; command = null; continue; }
    const count = counts[upper];
    // SVG permits adjacent arc flags, e.g. "A30 20 0 01100 0".
    if (upper === "A") for (const offset of [3, 4]) {
      const flag = tokens[index + offset];
      if (flag && /^[01]/.test(flag) && flag.length > 1) tokens.splice(index + offset, 1, flag[0], flag.slice(1));
    }
    if (!count || index + count > tokens.length || tokens.slice(index, index + count).some((token) => !Number.isFinite(Number(token)))) throw new Error("Path SVG possui comando ou coordenadas inválidos.");
    const args = tokens.slice(index, index + count).map(Number); index += count;
    if (upper === "A" && (!args.slice(3, 5).every((flag) => flag === 0 || flag === 1) || args[0] < 0 || args[1] < 0)) throw new Error("Path SVG possui arco inválido.");
    const px = (i) => args[i] + (relative ? x : 0), py = (i) => args[i] + (relative ? y : 0);
    let end;
    add(x, y);
    if (upper === "M" || upper === "L") { end = [px(0), py(1)]; if (upper === "M") { origin = end; points.pop(); command = relative ? "l" : "L"; } }
    else if (upper === "H") end = [px(0), y];
    else if (upper === "V") end = [x, py(0)];
    else if (["C", "S", "Q", "T"].includes(upper)) {
      let first, second;
      const reflect = () => control ? [2 * x - control[0], 2 * y - control[1]] : [x, y];
      if (upper === "C") { first = [px(0), py(1)]; second = [px(2), py(3)]; end = [px(4), py(5)]; control = second; }
      else if (upper === "S") { first = ["C", "S"].includes(previous) ? reflect() : [x, y]; second = [px(0), py(1)]; end = [px(2), py(3)]; control = second; }
      else {
        const quadratic = upper === "Q" ? [px(0), py(1)] : ["Q", "T"].includes(previous) ? reflect() : [x, y];
        end = upper === "Q" ? [px(2), py(3)] : [px(0), py(1)];
        first = [x + 2 / 3 * (quadratic[0] - x), y + 2 / 3 * (quadratic[1] - y)];
        second = [end[0] + 2 / 3 * (quadratic[0] - end[0]), end[1] + 2 / 3 * (quadratic[1] - end[1])]; control = quadratic;
      }
      curve(x, first[0], second[0], end[0]).forEach((value) => add(value, y));
      curve(y, first[1], second[1], end[1]).forEach((value) => add(x, value));
      if (sample) for (let step = 1; step < resolution; step++) {
        const t = step / resolution, u = 1 - t;
        samples.push({ x: u ** 3 * x + 3 * u ** 2 * t * first[0] + 3 * u * t ** 2 * second[0] + t ** 3 * end[0], y: u ** 3 * y + 3 * u ** 2 * t * first[1] + 3 * u * t ** 2 * second[1] + t ** 3 * end[1] });
      }
    } else if (upper === "A") {
      end = [px(5), py(6)];
      let rx = Math.abs(args[0]), ry = Math.abs(args[1]);
      if (rx && ry && (x !== end[0] || y !== end[1])) {
        const angle = args[2] * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        const xp = cos * (x - end[0]) / 2 + sin * (y - end[1]) / 2, yp = -sin * (x - end[0]) / 2 + cos * (y - end[1]) / 2;
        const scale = Math.sqrt(Math.max(1, xp * xp / (rx * rx) + yp * yp / (ry * ry))); rx *= scale; ry *= scale;
        const factor = (args[3] === args[4] ? -1 : 1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp) / (rx * rx * yp * yp + ry * ry * xp * xp)));
        const cxp = factor * rx * yp / ry, cyp = -factor * ry * xp / rx;
        const cx = cos * cxp - sin * cyp + (x + end[0]) / 2, cy = sin * cxp + cos * cyp + (y + end[1]) / 2;
        const start = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx), finish = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx);
        const tau = Math.PI * 2, positive = (v) => (v % tau + tau) % tau;
        const span = args[4] ? positive(finish - start) : positive(start - finish);
        const ex = Math.atan2(-ry * sin, rx * cos), ey = Math.atan2(ry * cos, rx * sin);
        [ex, ex + Math.PI, ey, ey + Math.PI].forEach((t) => {
          if ((args[4] ? positive(t - start) : positive(start - t)) <= span + 1e-10) add(cx + rx * cos * Math.cos(t) - ry * sin * Math.sin(t), cy + rx * sin * Math.cos(t) + ry * cos * Math.sin(t));
        });
        if (sample) for (let step = 1; step < resolution; step++) {
          const t = start + (args[4] ? 1 : -1) * span * step / resolution;
          samples.push({ x: cx + rx * cos * Math.cos(t) - ry * sin * Math.sin(t), y: cy + rx * sin * Math.cos(t) + ry * cos * Math.sin(t) });
        }
      }
    }
    [x, y] = end; add(x, y); if (sample) samples.push({ x, y, ...(upper === "M" ? { move: true } : {}) }); previous = upper;
    if (!["C", "S", "Q", "T"].includes(upper)) control = null;
  }
  return sample ? samples : geometry.pointsBounds(points);
}

export const pathBounds = (source) => pathGeometry(source, false);
export const pathPoints = (source) => pathGeometry(source, true);
