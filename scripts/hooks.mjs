import {findContainers, findGrids} from "./api.mjs";
import {MODULE} from "./constants.mjs";
import {_getFirstOwnerId, callMacro, renderTemplateMacroConfig} from "./templatemacro.mjs";

// Create a button in a template's header.
export function _createHeaderButton(config, buttons) {
  if ((config.document instanceof Item) && !config.document.hasAreaTarget) return;
  buttons.unshift({
    class: MODULE,
    icon: "fa-solid fa-ruler-combined",
    onclick: () => renderTemplateMacroConfig(config.document)
  });
}

// save previous state of templates containing tokenDoc.
export function _preUpdateToken(tokenDoc, update, context, userId) {
  foundry.utils.setProperty(context, `${MODULE}.wasIn`, findContainers(tokenDoc));
  const coords = {x: tokenDoc.x, y: tokenDoc.y};
  foundry.utils.setProperty(context, `${MODULE}.coords.previous`, coords);
}

// find those you entered and left.
export async function _updateToken(tokenDoc, update, context, userId) {
  const hasX = foundry.utils.hasProperty(update, "x");
  const hasY = foundry.utils.hasProperty(update, "y");
  if (!hasX && !hasY) return;

  await CanvasAnimation.getAnimation(tokenDoc.object.animationName)?.promise;
  const coords = {x: tokenDoc.x, y: tokenDoc.y};
  const previousCoords = foundry.utils.getProperty(context, `${MODULE}.coords.previous`);

  const {id: gmId} = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  // those you are in now and were in before (and might still be in).
  const current = findContainers(tokenDoc);
  const previous = foundry.utils.getProperty(context, `${MODULE}.wasIn`) ?? [];
  // those you have left, have entered, and have stayed in.
  const leaving = previous.filter(p => !current.includes(p));
  const entering = current.filter(p => !previous.includes(p));
  const staying = previous.filter(p => current.includes(p));
  // mapping of all grid cells (within templates) you moved through.
  const through = tokenDoc.parent.templates.reduce((acc, templateDoc) => {
    const cells = findGrids(previousCoords, coords, templateDoc);
    if (!cells.length) return acc;
    acc.push({templateId: templateDoc.id, cells});
    return acc;
  }, []);
  foundry.utils.setProperty(context, `${MODULE}.through`, through);

  // Those you stayed outside of and moved through and ended outside of.
  const enteredAndLeft = through.filter(t => {
    return !leaving.includes(t.templateId) && !entering.includes(t.templateId) && !staying.includes(t.templateId);
  });

  const tokenId = tokenDoc.id;
  const macroContext = {
    gmId, userId, tokenId, coords: {
      previous: foundry.utils.deepClone(previousCoords),
      current: coords
    },
    hook: context
  };

  // call macros:
  function call(id, trigger) {
    const templateDoc = tokenDoc.parent.templates.get(id);
    if (templateDoc) callMacro(templateDoc, trigger, macroContext);
  }
  enteredAndLeft.forEach(({templateId}) => call(templateId, "whenThrough"));
  leaving.forEach(templateId => call(templateId, "whenLeft"));
  entering.forEach(templateId => call(templateId, "whenEntered"));
  staying.forEach(templateId => call(templateId, "whenStaying"));
}

// update the template with macros from the item that created it (dnd5e).
export function _preCreateTemplate(templateDoc, templateData, context, userId) {
  const item = fromUuidSync(templateDoc.flags.dnd5e?.origin || "");
  if (!item) return;
  const flagData = item.flags[MODULE] ?? {};
  templateDoc.updateSource({[`flags.${MODULE}`]: flagData});
}

// call whenCreated macros.
export function _createTemplate(templateDoc, context, userId) {
  const {id: gmId} = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  const current = {x: templateDoc.x, y: templateDoc.y};
  const macroContext = {gmId, userId, coords: {previous: null, current}};
  callMacro(templateDoc, "whenCreated", macroContext);
}

// call whenDeleted macros.
export function _deleteTemplate(templateDoc, context, userId) {
  const {id: gmId} = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  const current = {x: templateDoc.x, y: templateDoc.y};
  const macroContext = {gmId, userId, coords: {previous: null, current}};
  callMacro(templateDoc, "whenDeleted", macroContext);
}

// when hidden/revealed or moved.
export function _preUpdateTemplate(templateDoc, update, context, userId) {
  foundry.utils.setProperty(context, `${MODULE}.wasHidden`, templateDoc.hidden);
  const coords = {x: templateDoc.x, y: templateDoc.y};
  foundry.utils.setProperty(context, `${MODULE}.coords.previous`, coords);

}
export function _updateTemplate(templateDoc, update, context, userId) {
  const wasHidden = foundry.utils.getProperty(context, `${MODULE}.wasHidden`);
  const isHidden = templateDoc.hidden;
  const hide = !wasHidden && isHidden;
  const show = wasHidden && !isHidden;

  // has been moved?
  const previous = foundry.utils.getProperty(context, `${MODULE}.coords.previous`);
  const current = {x: templateDoc.x, y: templateDoc.y};
  const hasX = foundry.utils.hasProperty(update, "x");
  const hasY = foundry.utils.hasProperty(update, "y");
  const moved = hasX || hasY;

  const {id: gmId} = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  const macroContext = {gmId, userId, coords: {previous, current}};
  if (hide) callMacro(templateDoc, "whenHidden", macroContext);
  if (show) callMacro(templateDoc, "whenRevealed", macroContext);
  if (moved) callMacro(templateDoc, "whenMoved", macroContext);
}

// When starting or ending a turn.
export function _preUpdateCombat(combat, update, context, userId) {
  const was = combat.started;
  context[MODULE] = {was};
}
export function _updateCombat(combat, update, context, userId) {
  if ((context.direction === -1) || !combat.isActive) return;

  const prev = context[MODULE]?.was ? canvas.scene.tokens.get(combat.previous?.tokenId) : null;
  const curr = canvas.scene.tokens.get(combat.current?.tokenId);

  const coords = {};
  if (prev) coords.previous = {x: prev.x, y: prev.y, tokenId: prev.id};
  if (curr) coords.current = {x: curr.x, y: curr.y, tokenId: curr.id};

  const {id: gmId} = game.users.find(u => u.active && u.isGM) ?? {};
  const macroContext = {};
  if (prev) macroContext.prev = {gmId, userId: _getFirstOwnerId(prev), tokenId: prev.id};
  if (curr) macroContext.curr = {gmId, userId: _getFirstOwnerId(curr), tokenId: curr.id};

  // get containing templates.
  const containers = {};
  if (prev) containers.previous = findContainers(prev);
  if (curr) containers.current = findContainers(curr);

  for (const id of containers.previous ?? []) {
    const template = canvas.scene.templates.get(id);
    callMacro(template, "whenTurnEnd", macroContext.prev);
  }

  for (const id of containers.current ?? []) {
    const template = canvas.scene.templates.get(id);
    callMacro(template, "whenTurnStart", macroContext.curr);
  }
}
