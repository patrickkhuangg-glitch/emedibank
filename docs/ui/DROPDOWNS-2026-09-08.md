# Shared dropdown styling

Published to https://studocyte.emeducate.com.au on 8 September 2026. Deployment: `dpl_CUiAtbvAX2GjVuM3xNb2DokgBnLr`. The isolated release retained the previous production source and changed only the four dropdown files. The main `studocyte` checkout remains the source for future work. Existing cleanup and monitoring schedules remain enabled.

The global stylesheet imports `src/app/dropdowns.css`. Single-choice dropdowns share white surfaces, violet borders/focus, rounded corners, a chevron and 44px minimum height. Supported browsers also show a bounded, scrollable menu with rounded options, lavender selection, a checkmark and a short opening transition. Long labels wrap inside the picker. Reduced-motion preferences disable animation. Exam-switcher and workspace-navigation dropdowns share the same panel, shadow and row tokens.

Native select elements remain in place: existing controlled values, server-rendered options, form names, required validation, keyboard/typeahead behaviour and disabled states are preserved. Multi-select listboxes and controls marked `data-native-select` retain native rendering. Dark `.field-dark` selectors keep a dark trigger and a legible light popup in supporting browsers. The amber invalid-field colour follows the existing tutor-editor error convention.

Custom picker styling is progressive enhancement. Browsers without `appearance: base-select` / `::picker(select)` keep their operating-system picker with the themed closed field. This is not a claim of identical open-menu rendering across Safari, Firefox and Chrome. Reference: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select

## Validation

- Tested the actual local practice page in Chrome at 1440px and 390px, including the 74-station list and long panel questions.
- Confirmed keyboard selection through the last station, Escape dismissal, controlled selection updates, required validation, FormData values, disabled controls, native multi-select fallback, reduced motion and no mobile horizontal overflow or runtime errors.
- Full lint passed with the existing past-session `<img>` warning; production build passed.
- Screenshots and 12 local browser checks are in `artifacts/dropdowns/`. After publication, eight live checks passed: custom picker rendering, opening, keyboard selection, Escape, controlled panel selection, mobile layout, reduced motion and no browser runtime errors. Live receipts are in `artifacts/dropdowns/live/`.

Preview while the local development server is running: http://127.0.0.1:3218/prototypes/interviews/practice
