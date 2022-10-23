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
export function callMacro(templateDoc, whenWhat, context) {
  const script = templateDoc.getFlag(MODULE, `${whenWhat}.command`);
  const asGM = templateDoc.getFlag(MODULE, `${whenWhat}.asGM`);
  if (!script) return;
  const body = `(async()=>{
    ${script}
  })();`;

  const id = asGM ? context.gmId : context.userId;
  if (game.user.id !== id) return;
  const fn = Function("template", "scene", "token", body);

  const template = templateDoc.object;
  const scene = templateDoc.parent;
  const token = scene.tokens.get(context.tokenId)?.object ?? null;
  fn.call(context, template, scene, token);
}

/**
 * Returns the templateDocument ids that contain a tokenDocument.
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
          containers.push(templateDoc.id);
          continue;
        }
      }
    }
  }
  return containers;
}

/**
 * Returns the tokenDocument ids that are contained within a templateDocument.
 */
export function findContained(templateDoc) {
  const { size } = templateDoc.parent.grid;
  const { x: tempx, y: tempy, object } = templateDoc;
  const tokenDocs = templateDoc.parent.tokens;
  const contained = [];
  for (const tokenDoc of tokenDocs) {
    const { width, height, x: tokx, y: toky } = tokenDoc;
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
          contained.push(tokenDoc.id);
          continue;
        }
      }
    }
  }
  return contained;
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
