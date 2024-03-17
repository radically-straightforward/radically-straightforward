# TODO

- Currently whether a substitution is safe is determined by the context (`${...}` vs `$${...}`). Consider introducing a notion of marking a substitution as safe in and of itself and bypassing escaping even when using `${...}`.
  - You can’t add custom properties to native values like strings, so it would have to be a wrapper, for example:
    ```javascript
    const example = new String("hello");
    example.htmlSafe = true;
    ```
  - As far as I remember, this is Ruby on Rail’s design.
  - Perhaps this is a bad idea, because having more than one way to do things may lead to confusion and errors in people’s code. Besides, we haven’t needed this so far.
