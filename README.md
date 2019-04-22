# vault-pam-ui
A web client to connect to an existing Vault server.

## Quick start guide
1. Install [Node.js](https://nodejs.org).
2. Run `npm install`.
3. Run `cp .env.TEMPLATE .env` (You will need the actual values from a fellow developer).
4. Run `npm start`.

## Running the built application
To run the client with built code locally, execute the following:
```
$ npm run build
$ cd dist
$ npm install --production
$ USE_HSTS=false PORT=8080 npm run startprod
```

## Application stack
### Front End
- [React](https://facebook.github.io/react/docs/why-react.html) - JavaScript library for building user interfaces.
- [React Redux](http://redux.js.org/index.html) - Application state container.
- [React Router](https://reacttraining.com/react-router) - Declarative routing library for React.
- [Material UI](https://material-ui.com/) - React components that implement Google's Material Design.

### Back End
- [Express.js](https://expressjs.com) - Web application framework. The ubiquitous Node.js web server.
- [Sequelize](http://docs.sequelizejs.com) - Node.js ORM for PostgreSQL, MySQL, MariaDB, SQLite and Microsoft SQL Server.
- [Socket.IO](https://socket.io) - Library to enable realtime bi-directional communication between clients and servers.
- [Vault](https://www.vaultproject.io]) - The secrets engine behind the application.

### And More...
- For the exhaustive list of libraries leveraged by the application, refer to the list of `dependencies` in the [package.json](../package.json) manifest file.

## Application dependencies
- [Node.js](https://nodejs.org/) - JavaScript runtime built on [Chrome's V8](https://developers.google.com/v8/) engine. In practical terms, when running the [client application locally](../README.md), an [Express server](http://expressjs.com/) instance is started providing a simple proxy router with CORS support.
- [npm](https://www.npmjs.com/) - JavaScript package manager. In fact, it goes hand in hand with Node.js. When you download Node, npm will come packaged together with it.
- [Babel](https://babeljs.io/) - JavaScript ES6 (aka ES2015 or ECMAScript 6) compiler, or [transpiler](https://en.wikipedia.org/wiki/Source-to-source_compiler) to be more precise. Because the client application is written in ES6, the source code must be transpiled to standard ES5 syntax for browsers that do not yet support it.
- [webpack](https://webpack.github.io/) - Module bundler. In short, when running a build of the client application, webpack is used to bundle and package all the individual JavaScript modules into one or more compiled files to lessen the overhead of making multiple network requests.
- For the exhaustive list of application development dependencies, refer to the list of `devDependencies` in the [package.json](../package.json) manifest file.

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

