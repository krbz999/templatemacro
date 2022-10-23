import { MODULE } from "./constants.mjs";
import { callMacro, findContainers, renderTemplateMacroConfig } from "./templatemacro.mjs";

// Create a button in a template's header.
export function _createHeaderButton(config, buttons) {
  buttons.unshift({
    class: MODULE,
    icon: "fa-solid fa-ruler-combined",
    onclick: () => renderTemplateMacroConfig(config.object)
  });
}

// save previous state of templates containing tokenDoc.
export function _preUpdateToken(tokenDoc, update, context, userId) {
  foundry.utils.setProperty(context, `${MODULE}.wasIn`, findContainers(tokenDoc));
}

// find those you entered and left.
export function _updateToken(tokenDoc, update, context, userId) {
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

  // call macros:
  leaving.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    if (templateDoc) callMacro(templateDoc, "whenLeft", { gmId, userId });
  });
  entering.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    if (templateDoc) callMacro(templateDoc, "whenEntered", { gmId, userId });
  });
  staying.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    if (templateDoc) callMacro(templateDoc, "whenStaying", { gmId, userId });
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
  callMacro(templateDoc, "whenCreated", { gmId, userId });
}

// call whenDeleted macros.
export function _deleteTemplate(templateDoc, context, userId) {
  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  callMacro(templateDoc, "whenDeleted", { gmId, userId });
}

// when hidden/revealed.
export function _preUpdateTemplate(templateDoc, update, context, userId) {
  foundry.utils.setProperty(context, `${MODULE}.wasHidden`, templateDoc.hidden);
}
export function _updateTemplate(templateDoc, update, context, userId) {
  const wasHidden = foundry.utils.getProperty(context, `${MODULE}.wasHidden`);
  const isHidden = templateDoc.hidden;
  const hide = !wasHidden && isHidden;
  const show = wasHidden && !isHidden;
  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  if (hide) callMacro(templateDoc, "whenHidden", { gmId, userId });
  if (show) callMacro(templateDoc, "whenRevealed", { gmId, userId });
}
