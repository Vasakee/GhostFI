/**
 * require-addon shim for browser/Next.js client bundle.
 *
 * In source code the pattern is:
 *   require.addon = require('require-addon')
 *   module.exports = require.addon(specifier, parentURL)   // load native binding
 *
 * Webpack bundles this as:
 *   n(3358).addon()   // where n(3358) is this module
 *
 * So this module must export a function that ALSO has an `.addon()` method,
 * both returning a no-op proxy so native binding calls silently do nothing.
 */

const noopProxy = new Proxy(function () {}, {
  get: (_, prop) => prop === 'then' ? undefined : noopProxy,
  apply: () => noopProxy,
  construct: () => noopProxy,
});

// Export a callable function (for require.addon(specifier, url) usage)
// that also has an .addon() method (for n(3358).addon() webpack pattern)
const addonFn = new Proxy(function () { return noopProxy; }, {
  get: (target, prop) => {
    if (prop === 'addon') return () => noopProxy;
    if (prop === 'resolve') return () => '';
    if (prop === 'host') return 'browser';
    return Reflect.get(target, prop);
  },
  apply: () => noopProxy,
});

module.exports = addonFn;
