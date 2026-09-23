# Generate

This component uses entity and solution templates, along with some customization questions, to built out deployable assets for testing and delivery.

## Getting Started

The templates that this command uses are stored in a separate repo that needs to be cloned locally before anything can be output. These are stored in a private repo in the Apivant GitHub.

Pass the cloned repo's location with `--templates-path`, as a direct or relative (from where the script is run) path:

```
npm run generate -- --templates-path <path>
```

If omitted, templates are read from this component's local `templates` directory.

## Solutions

A `Solution > ...` template can include a `solution.json` file listing the other top-level templates (by their full `Type > Name`) it's built from. Every referenced template is checked for existence before anything is written - if any are missing, nothing is created.

`solution.json` can be either:

- An array of template names, using each template's default output name:

  ```json
  ["Action > Post-Login > Add Custom Claims", "Flow > Send Welcome Email"]
  ```

- An object keyed by template name, where a value can override the output name and/or mark the entry as optional:

  ```json
  {
    "Action > Post-Login > Add Custom Claims": { "name": "Custom Claims - Onboarding" },
    "Flow > Send Welcome Email": { "optional": true },
    "Form > Progressive Profiling": null
  }
  ```

Setting `"optional": true` on an entry prompts the developer to confirm whether to create it before it's written; declining skips that entry without affecting the rest of the solution.

Only `Action`, `Flow`, and `Form` templates are supported in a solution. If a `Solution` template has no `solution.json`, its own subdirectories (named `Action > ...`, `Flow > ...`, `Form > ...`) are used instead.
