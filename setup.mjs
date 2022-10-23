import { MODULE, TRIGGERS } from "./scripts/constants.mjs";
import { callMacro, findContainers, renderTemplateMacroConfig } from "./scripts/templatemacro.mjs";

// Create a button in a template's header.
Hooks.on("getMeasuredTemplateConfigHeaderButtons", (config, buttons) => {
  buttons.unshift({
    class: MODULE,
    icon: "fa-solid fa-ruler-combined",
    onclick: () => renderTemplateMacroConfig(config.object)
  });
});

// save previous state of templates containing tokenDoc.
Hooks.on("preUpdateToken", (tokenDoc, update, context, userId) => {
  foundry.utils.setProperty(context, `${MODULE}.wasIn`, findContainers(tokenDoc));
});

// find those you entered and left.
Hooks.on("updateToken", (tokenDoc, update, context, userId) => {
  const { id: gmId } = game.users.find(user => {
    return user.active && user.isGM;
  }) ?? {};
  // those you are in now.
  const current = findContainers(tokenDoc);
  // those you were in before (but might still be in).
  const previous = foundry.utils.getProperty(context, `${MODULE}.wasIn`) ?? [];
  // those you have left.
  const leaving = previous.filter(p => !current.includes(p));
  // those you have entered.
  const entering = current.filter(p => !previous.includes(p));

  // call macros:
  leaving.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    return callMacro(templateDoc, "whenLeft", { gmId, userId });
  });
  entering.map(templateId => {
    const templateDoc = tokenDoc.parent.templates.get(templateId);
    return callMacro(templateDoc, "whenEntered", { gmId, userId });
  });
});
