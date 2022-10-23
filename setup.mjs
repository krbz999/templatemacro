import {
  _createHeaderButton,
  _preUpdateToken,
  _updateToken
} from "./scripts/hooks.mjs";

Hooks.on("getMeasuredTemplateConfigHeaderButtons", _createHeaderButton);
Hooks.on("preUpdateToken", _preUpdateToken);
Hooks.on("updateToken", _updateToken);
