# Question import template

Fill this spreadsheet in (Excel or Google Sheets), export as **CSV**, then upload it at
**Admin → Questions → Bulk import**. One row = one question.

## Columns

| Column | Notes |
|---|---|
| `exam` | `UCAT`, `GAMSAT`, `ISAT`, or `Interviews` (must match exactly). |
| `subtest` | The subtest name, e.g. `Verbal Reasoning`, `Decision Making`, `Situational Judgement`. |
| `type` | `mcq`, `passage`, `grid`, or `most_least`. |
| `stimulus_key` | Any label (e.g. `VR1`). **Rows that share a key share one passage/scenario/diagram.** Leave blank for standalone questions. |
| `passage` | The shared text/scenario. Put it on the **first** row of a stimulus key; leave blank on the others. |
| `image_url` | URL of a diagram (QR). Stimulus-level if a `stimulus_key` is set, otherwise question-level. |
| `table` | A data table. Rows separated by `;`, cells by `|`, first row = headers. e.g. `Month\|Sales;Jan\|120;Feb\|150`. |
| `stem` | The question text (or, for `most_least`, the scenario + instruction). |
| `tags` | Comma-separated. **Tag DM syllogism / interpreting-information questions so they use the Yes/No grid.** |
| `option_a` … `option_e` | MCQ / passage options (fill as many as you use). |
| `correct` | The correct option **letter** (`A`–`E`) for MCQ / passage. |
| `statements` | **Grid only.** `Statement text :: Yes ; Next statement :: No ; …` (up to 6). |
| `actions` | **Most/Least only.** `Action one ; Action two ; Action three`. |
| `most` / `least` | **Most/Least only.** The **number** of the most / least appropriate action (1-based). |
| `explanation` | Written rationale (shown after answering; also the video sits alongside it). |
| `difficulty` | `easy`, `medium`, or `hard` (optional). |
| `published` | `yes` to make it live, `no`/blank to leave as a draft. |

## Question types — which columns to fill

- **MCQ** (QR, DM arguments): `stem`, `option_a…`, `correct`.
- **Passage MCQ** (VR, SJT rating): share a `stimulus_key`; put the `passage` on the first row; then `stem`, `option_a…`, `correct`.
- **Grid** (DM syllogisms / interpreting info): `stem` (the premises), `statements`, and tag it `Syllogisms` or `Interpreting Information`.
- **Most/Least** (SJT): `stem` (scenario), `actions`, `most`, `least`.

The template file has one worked example of each — copy a row and edit it.

Videos are added per question afterwards in **Admin → Questions** (they attach to the matching question).
