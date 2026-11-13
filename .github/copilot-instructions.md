# Space quiz

- The application is a standalone `index.html`: markup, CSS, question data, and vanilla JavaScript are all inline. Keep it usable directly from a `file://` URL without a server or dependencies.
- Open `index.html` in a browser to run it. For a manual smoke check, answer correctly and incorrectly, check the score and progress, finish all ten questions, and restart. Also check keyboard navigation and both color schemes.

## Quiz behavior

- Each `questions` entry has `question`, `answers`, a zero-based `correct` answer index, and a `fact` displayed after answering.
- `renderQuestion()` creates the answer buttons; `selectAnswer()` allows one selection, updates score and completed-question progress, disables answers, and reveals feedback and the next button. `showResults()` chooses a reaction based on the score; restart resets the in-memory state.
- Keep the progress bar's `aria-valuenow` synchronized with the visual fill. Its `aria-valuemax` is currently fixed at 10, so update it if the question count changes.
- Preserve the status announcement for feedback, visible keyboard focus, and focus moves to the next question or results after navigation.

## Styling

- Theme colors are CSS custom properties with dark-mode overrides under `prefers-color-scheme`. Preserve both themes when adding colors.
- Keep the centered narrow layout responsive and respect `prefers-reduced-motion` for feedback animations.
