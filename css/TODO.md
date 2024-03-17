# TODO

- Present CSS variables as JavaScript variables, for example, replace `color: var(--color--green--200);` with `color: ${css.color.green[200]};`?
  - Advantages:
    - Autocomplete.
    - Type checking.
  - Disadvantages:
    - Layer of indirection (think of experimenting in browser developer tools: you still have to know the CSS variable, and you can’t copy-and-paste the result of your experiments).
    - Potentially awkward to extend (think of defining new colors).
