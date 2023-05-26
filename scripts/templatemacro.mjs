import {MODULE, TRIGGERS} from "./constants.mjs";

export function renderTemplateMacroConfig(templateDocument) {
  new TemplateMacroConfig(templateDocument, {}).render(true);
}

/**
 * Execute macros.
 * @param {MeasuredTemplateDocument} templateDoc      The template document.
 * @param {string} whenWhat                           The trigger.
 * @param {object} context                            Object with assorted data needed to run the script.
 * @param {string} context.gmId                       The user id of the first active gm found.
 * @param {string} context.userId                     The user id of the triggering user, the one calling the script.
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
  templateDoc.object?.refresh();
  const fn = Function("template", "scene", "token", body);

  //const template = templateDoc.object;
  const scene = templateDoc.parent;
  const token = scene.tokens.get(context.tokenId)?.object ?? null;
  fn.call(context, templateDoc, scene, token);
}

/**
 * Get the id of user who owns a token, but only if they are active.
 * This method prefers a player owner.
 * @param {TokenDocument} token     A token document.
 * @returns {string}                The id of a user.
 */
export function _getFirstOwnerId(token) {
  const player = game.users.find(u => !u.isGM && u.active && token.testUserPermission(u, "OWNER"));
  if (player) return player.id;
  return game.users.find(u => u.isGM && u.active)?.id;
}

export class TemplateMacroConfig extends MacroConfig {
  constructor(templateDocument, options) {
    super(templateDocument, options);
    this.initial = TRIGGERS.find(t => templateDocument.flags[MODULE]?.[t]?.command) ?? null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "modules/templatemacro/templates/templatemacro.hbs",
      classes: ["macro-sheet", "sheet", MODULE],
      tabs: [{navSelector: ".tabs", contentSelector: ".content-tabs"}],
      width: 700,
      height: 600
    });
  }

  get id() {
    return `${MODULE}-${this.object.id}`;
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    data.name = `${game.i18n.localize("DOCUMENT.MeasuredTemplate")}: ${this.object.id}`;
    const flag = this.object.flags[MODULE] ?? {};
    data.triggers = TRIGGERS.map(trigger => {
      return {
        type: trigger,
        command: flag[trigger]?.command,
        asGM: flag[trigger]?.asGM,
        label: `TEMPLATEMACRO.${trigger}`,
        desc: `TEMPLATEMACRO.${trigger}Desc`,
        has: !!flag[trigger]?.command
      };
    });
    return data;
  }

  /** @override */
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

  /** @override */
  async _renderInner(data) {
    if (this.initial) this._tabs[0].active = this.initial;
    return super._renderInner(data);
  }
}
