import { MODULE, TRIGGERS } from "./constants.mjs";

export function renderTemplateMacroConfig(templateDocument) {
  new TemplateMacroConfig(templateDocument, {}).render(true);
}

/**
 * Execute macros.
 * @param templateDoc The template document.
 * @param whenWhat    The trigger.
 * @param context     Object with misc stuff, such as the id of the first active gm found,
 *                    the id of the triggering user, and any other assorted coordinates.
 */
export function callMacro(templateDoc, whenWhat, context) {
  const script = templateDoc.getFlag(MODULE, `${whenWhat}.command`);
  const asGM = templateDoc.getFlag(MODULE, `${whenWhat}.asGM`);
  if (!script) return;
  const body = `(async()=>{
    ${script}
  })();`;

  const id = asGM ? context.gmId : context.userId;
  if (game.user.id !== id) return;
  templateDoc.object?._refresh();
  const fn = Function("template", "scene", "token", body);

  //const template = templateDoc.object;
  const scene = templateDoc.parent;
  const token = scene.tokens.get(context.tokenId)?.object ?? null;
  fn.call(context, templateDoc, scene, token);
}

export class TemplateMacroConfig extends MacroConfig {
  constructor(templateDocument, options) {
    super(templateDocument, options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "modules/templatemacro/templates/templatemacro.hbs",
      classes: ["macro-sheet", "sheet"]
    });
  }

  get id() {
    return `${MODULE}-${this.object.id}`;
  }

  activateListeners(html) {
    html[0].addEventListener("click", (event) => {
      const trigger = event.target.closest(".templatemacro .triggers .trigger");
      if (!trigger) return;
      const type = trigger.dataset.type;
      const form = trigger.closest("form");
      form.classList.remove(...TRIGGERS.filter(t => t !== type));
      form.classList.add(type);
    });
  }

  async getData() {
    const data = await super.getData();
    data.name = `Template: ${this.object.id}`;
    data.triggers = TRIGGERS.map(trigger => {
      return {
        type: trigger,
        command: this.object.getFlag(MODULE, `${trigger}.command`),
        asGM: this.object.getFlag(MODULE, `${trigger}.asGM`),
        label: game.i18n.localize(`TEMPLATEMACRO.${trigger}`)
      }
    });
    return data;
  }

  async _updateObject(event, formData) {
    for (const trigger of TRIGGERS) {
      if (!formData[`flags.${MODULE}.${trigger}.command`]) {
        delete formData[`flags.${MODULE}.${trigger}.command`];
        delete formData[`flags.${MODULE}.${trigger}.asGM`];
        formData[`flags.${MODULE}.-=${trigger}`] = null;
      }
    }
    return this.object.update(formData);
  }
}
