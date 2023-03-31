/**
 * Returns the upper-left coordinates of any grid cells within a template
 * that are on the direct path between the two points.
 */
export function findGrids(A, B, templateDoc) {
  const a = canvas.grid.getCenter(A.x, A.y);
  const b = canvas.grid.getCenter(B.x, B.y)
  const ray = new Ray({x: a[0], y: a[1]}, {x: b[0], y: b[1]});
  if (ray.distance === 0) return [];

  const scene = templateDoc.parent;
  const gridCenter = scene.grid.size / 2;
  const locations = new Set();
  const spacer = scene.grid.type === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
  const nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(canvas.grid.w, canvas.grid.h))), 1);
  const tMax = Array.fromRange(nMax + 1).map(t => t / nMax);

  let prior = null;
  for (const [i, t] of tMax.entries()) {
    const {x, y} = ray.project(t);
    const [r0, c0] = (i === 0) ? [null, null] : prior;
    const [r1, c1] = canvas.grid.grid.getGridPositionFromPixels(x, y);
    if (r0 === r1 && c0 === c1) continue;

    const [x1, y1] = canvas.grid.grid.getPixelsFromGridPosition(r1, c1);
    const contained = templateDoc.object.shape.contains(
      x1 + gridCenter - templateDoc.object.center.x,
      y1 + gridCenter - templateDoc.object.center.y
    );   //Replace with checking what template(s) x1,y1 are in here.
    if (contained) locations.add({x: x1, y: y1});

    prior = [r1, c1];
    if (i === 0) continue;

    if (!canvas.grid.isNeighbor(r0, c0, r1, c1)) {
      const th = tMax[i - 1] + (0.5 / nMax);
      const {x, y} = ray.project(th);
      const [rh, ch] = canvas.grid.grid.getGridPositionFromPixels(x, y);
      const [xh, yh] = canvas.grid.grid.getPixelsFromGridPosition(rh, ch);
      const contained = templateDoc.object.shape.contains(
        xh + gridCenter - templateDoc.object.center.x,
        yh + gridCenter - templateDoc.object.center.y
      );  //Replace with checking what template(s) xh,yh are in here.
      if (contained) locations.add({x: xh, y: yh});
    }
  }
  return [...locations];
}

/**
 * Returns the tokenDocument ids that are contained within a templateDocument.
 */
export function findContained(templateDoc) {
  const {size} = templateDoc.parent.grid;
  const {x: tempx, y: tempy, object} = templateDoc;
  const tokenDocs = templateDoc.parent.tokens;
  const contained = new Set();
  for (const tokenDoc of tokenDocs) {
    const {width, height, x: tokx, y: toky} = tokenDoc;
    const startX = width >= 1 ? 0.5 : width / 2;
    const startY = height >= 1 ? 0.5 : height / 2;
    for (let x = startX; x < width; x++) {
      for (let y = startY; y < width; y++) {
        const curr = {
          x: tokx + x * size - tempx,
          y: toky + y * size - tempy
        };
        const contains = object.shape.contains(curr.x, curr.y);
        if (contains) {
          contained.add(tokenDoc.id);
          continue;
        }
      }
    }
  }
  return [...contained];
}

/**
 * Return the ids of the template documents that contain a given token document.
 * @param {TokenDocument} tokenDoc      The token document to evaluate.
 * @returns {string[]}                  The ids of template documents.
 */
export function findContainers(tokenDoc) {
  const {size} = tokenDoc.parent.grid;
  const {width, height, x: tokx, y: toky} = tokenDoc;
  const templateDocs = tokenDoc.parent.templates;
  const containers = new Set();
  for (const templateDoc of templateDocs) {
    const {x: tempx, y: tempy, object} = templateDoc;
    const startX = width >= 1 ? 0.5 : width / 2;
    const startY = height >= 1 ? 0.5 : height / 2;
    for (let x = startX; x < width; x++) {
      for (let y = startY; y < width; y++) {
        const curr = {
          x: tokx + x * size - tempx,
          y: toky + y * size - tempy
        };
        const contains = object.shape.contains(curr.x, curr.y);
        if (contains) {
          containers.add(templateDoc.id);
          continue;
        }
      }
    }
  }
  return [...containers];
}
