---
'@kernhq/module-tracker': patch
---

Export the field-layout types from `@kernhq/module-tracker/client`.

`ResolvedLayout`, `ResolvedField`, `FieldLayoutItem`, `ProjectTemplateBody`, `ProjectTemplateId` and
`SystemFieldId` were added to the contract but not to the client's type surface, so an interface
could call `types.layout` and had no way to name what came back.
