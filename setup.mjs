import {
  _createHeaderButton,
  _createTemplate,
  _deleteTemplate,
  _preCreateTemplate,
  _preUpdateTemplate,
  _preUpdateToken,
  _updateTemplate,
  _updateToken
} from "./scripts/hooks.mjs";

Hooks.on("getMeasuredTemplateConfigHeaderButtons", _createHeaderButton);
Hooks.on("getItemSheetHeaderButtons", _createHeaderButton);
Hooks.on("preUpdateToken", _preUpdateToken);
Hooks.on("updateToken", _updateToken);
Hooks.on("preCreateMeasuredTemplate", _preCreateTemplate);
Hooks.on("createMeasuredTemplate", _createTemplate);
Hooks.on("deleteMeasuredTemplate", _deleteTemplate);
Hooks.on("preUpdateMeasuredTemplate", _preUpdateTemplate);
Hooks.on("updateMeasuredTemplate", _updateTemplate);
