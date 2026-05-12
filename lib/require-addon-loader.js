/**
 * Webpack loader that transforms bare-runtime native binding files for browser.
 *
 * These files contain patterns like:
 *   require.addon = require('require-addon')
 *   module.exports = require.addon(specifier, parentURL)
 * or simply:
 *   module.exports = require.addon()
 *
 * In a browser webpack bundle, require.addon is undefined (it's a Node/Bare runtime
 * extension). This loader replaces the entire module with a no-op proxy so that
 * any property access or call on the binding silently returns undefined/noop.
 */
module.exports = function requireAddonLoader() {
  return `
var p = new Proxy(function(){}, {
  get: function(_, k) { return k === 'then' ? undefined : p; },
  apply: function() { return p; },
  construct: function() { return p; }
});
module.exports = p;
`;
};
