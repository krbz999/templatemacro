import { MODULE, TRIGGERS } from "./constants.mjs";

export function renderTemplateMacroConfig(templateDocument) {
  new TemplateMacroConfig(templateDocument, {}).render(true);
}

/**
 * Execute macros.
 * @param templateDoc The template document.
 * @param whenWhat    The trigger.
 * @param gmId        The first active GM found.
 * @param userId      The id of the user who moved a token or manipulated a template.
 */
export function callMacro(templateDoc, whenWhat, { gmId, userId }) {
  const script = templateDoc.getFlag(MODULE, `${whenWhat}.command`);
  const asGM = templateDoc.getFlag(MODULE, `${whenWhat}.asGM`);
  if (!script) return;
  const body = `(async()=>{
    ${script}
  })();`;

  const id = asGM ? gmId : userId;
  if (game.user.id !== id) return;
  const fn = Function("template", "scene", body);
  fn.call({}, template.object, templateDoc.parent);
}

/**
 * Returns the templateDocuments that contain a tokenDocument.
 */
export function findContainers(tokenDoc) {
  const { size } = tokenDoc.parent.grid;
  const { width, height, x: tokx, y: toky } = tokenDoc;
  const templateDocs = tokenDoc.parent.templates;
  const containers = [];
  for (const templateDoc of templateDocs) {
    const { x: tempx, y: tempy, object } = templateDoc;
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
          containers.push(templateDoc);
          continue;
        }
      }
    }
  }
  return containers;
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
    return `templatemacro-${this.object.id}`;
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
        script: this.object.getFlag(MODULE, `${trigger}.command`),
        asGM: this.object.getFlag(MODULE, `${trigger}.asGM`),
        label: game.i18n.localize(`TEMPLATEMACRO.${trigger}`)
      }
    });
    return data;
  }

  async _updateObject(event, formData) {
    return this.object.update(formData);
  }
}
