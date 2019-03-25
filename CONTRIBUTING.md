## General coding style
- Use an indent of 4 spaces, with no tabs. And absolutely under no circumstances shall there be a mixture of both spaces and tabs. Lastly, please refrain including trailing spaces within the codebase. Anywhere.
- When comparing equality, use the triple-equals operator (`===`) to enforce type safety.
- All methods must be accompanied by a JSDoc description.
- All private method names should be prefixed by an underscore (e.g. `_invokeHelperMethod() {...}`.
- Unless there is a specific reason, method definitions for a class should follow this order:
    1. constructor method
    2. private methods
    3. protected methods
    4. public methods
- Use single quotes for strings.
- The code is full ES6. As such, avoid using `var` to declare variables. Instead, use `let` or `const` where appropriate. Additionally, when declaring functions, the arrow syntax is preferred (e.g. `(myArg) => {...}` vs. `function(myArg) {...}`).

## Naming conventions
- All variables names should be camel-cased.
- Singleton classes should be **lower camel cased**.
- Abstract/base classes should be prefixed with an underscore.

## Code delivery standards
- Prior to delivering _any_ code changes, be sure to run:
    - `npm run lint`
    - `npm test`
