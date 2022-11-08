# Template Macro
You can use this module to trigger macros on certain events related to Measured Templates. The events include:
- when a template is created, deleted, moved, hidden, or revealed.
- when a token enters the area of a template, leaves the area, or moves within the area.

You can create macros in two ways:
- place a template and open its config, then click the icon in the header.
- click the icon in the header of an item that to create the Template Macros on the item. These macros are then copied to the template when it is created.

Any template macro has four declared helper variables: `template` (the template itself), `scene` (the parent of the template), `token` (the token moving, if relevant), and `this`, which contains a lot of other useful data, most notably any parameters passed through associated hooks.

The module contains some functions found in `game.modules.get("templatemacro").api`.
- `findContainers(tokenDoc)` returns the TemplateDocument ids that contain a TokenDocument.
- `findContained(templateDoc)` returns the TokenDocument ids that are contained within a TemplateDocument.
- `findGrids(A, B, templateDoc)` returns the grid cells between the two coordinates that are within a TemplateDocument.
