import { INVALID_TYPES, MODULE } from "./constants.mjs";
import { callMacro, findContainers, renderTemplateMacroConfig } from "./templatemacro.mjs";

// Create a button in a template's header.
export function _createHeaderButton(config, buttons) {
  if (INVALID_TYPES.includes(config.object.type)) return;
  buttons.unshift({
    class: MODULE,
    icon: "fa-solid fa-ruler-combined",
    onclick: () => renderTemplateMacroConfig(config.object)
  });
}

// save previous state of templates containing tokenDoc.
export function _preUpdateToken(tokenDoc, update, context, userId) {
  foundry.utils.setProperty(context, `${MODULE}.wasIn`, findContainers(tokenDoc));
  const coords = { x: tokenDoc.x, y: tokenDoc.y };
  foundry.utils.setProperty(context, `${MODULE}.coords.previous`, coords);
}

// find those you entered and left.
export async function _updateToken(tokenDoc, update, context, userId) {
  const hasX = foundry.utils.hasProperty(update, "x");
  const hasY = foundry.utils.hasProperty(update, "y");
  if (!hasX && !hasY) return;

  await CanvasAnimation.getAnimation(tokenDoc.object.animationName)?.promise;
  const coords = { x: tokenDoc.x, y: tokenDoc.y };
  const previousCoords = foundry.utils.getProperty(context, `${MODULE}.coords.previous`);

  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  // those you are in now and were in before (and might still be in).
  const current = findContainers(tokenDoc);
  const previous = foundry.utils.getProperty(context, `${MODULE}.wasIn`) ?? [];
  // those you have left, those you have entered, and those you stayed in.
  const leaving = previous.filter(p => !current.includes(p));
  const entering = current.filter(p => !previous.includes(p));
  const staying = previous.filter(p => current.includes(p));

  const tokenId = tokenDoc.id;
  const macroContext = {
    gmId, userId, tokenId, coords: {
      previous: foundry.utils.duplicate(previousCoords),
      current: coords
    },
    hook: context
  }
  delete context[MODULE];

  // call macros:
  leaving.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    if (templateDoc) callMacro(templateDoc, "whenLeft", macroContext);
  });
  entering.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    if (templateDoc) callMacro(templateDoc, "whenEntered", macroContext);
  });
  staying.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    if (templateDoc) callMacro(templateDoc, "whenStaying", macroContext);
  })
}

// update the template with macros from the item that created it.
export function _preCreateTemplate(templateDoc, templateData, context, userId) {
  const origin = templateDoc.getFlag("dnd5e", "origin");
  if (!origin) return;
  const item = fromUuidSync(origin);
  if (!item) return;
  const flagData = item.flags[MODULE] ?? {};
  templateDoc.updateSource({ [`flags.${MODULE}`]: flagData });
}

// call whenCreated macros.
export function _createTemplate(templateDoc, context, userId) {
  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  const current = { x: templateDoc.x, y: templateDoc.y };
  const macroContext = { gmId, userId, coords: { previous: null, current } };
  callMacro(templateDoc, "whenCreated", macroContext);
}

// call whenDeleted macros.
export function _deleteTemplate(templateDoc, context, userId) {
  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  const current = { x: templateDoc.x, y: templateDoc.y };
  const macroContext = { gmId, userId, coords: { previous: null, current } };
  callMacro(templateDoc, "whenDeleted", macroContext);
}

// when hidden/revealed or moved.
export function _preUpdateTemplate(templateDoc, update, context, userId) {
  foundry.utils.setProperty(context, `${MODULE}.wasHidden`, templateDoc.hidden);
  const coords = { x: templateDoc.x, y: templateDoc.y };
  foundry.utils.setProperty(context, `${MODULE}.coords.previous`, coords);

}
export function _updateTemplate(templateDoc, update, context, userId) {
  const wasHidden = foundry.utils.getProperty(context, `${MODULE}.wasHidden`);
  const isHidden = templateDoc.hidden;
  const hide = !wasHidden && isHidden;
  const show = wasHidden && !isHidden;

  // has been moved?
  const previous = foundry.utils.getProperty(context, `${MODULE}.coords.previous`);
  const current = { x: templateDoc.x, y: templateDoc.y };
  const hasX = foundry.utils.hasProperty(update, "x");
  const hasY = foundry.utils.hasProperty(update, "y");
  const moved = hasX || hasY;

  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  const macroContext = { gmId, userId, coords: { previous, current } };
  if (hide) callMacro(templateDoc, "whenHidden", macroContext);
  if (show) callMacro(templateDoc, "whenRevealed", macroContext);
  if (moved) callMacro(templateDoc, "whenMoved", macroContext);
}
