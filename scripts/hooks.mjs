import { MODULE } from "./scripts/constants.mjs";
import { callMacro, findContainers, renderTemplateMacroConfig } from "./scripts/templatemacro.mjs";

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
