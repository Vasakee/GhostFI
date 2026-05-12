/**
 * require-addon shim for browser
 * 
 * The bare ecosystem uses require.addon() to load native C++ bindings.
 * This shim ensures that even if native-only packages are accidentally 
 * bundled into the browser, they won't crash the application on load.
 */

function addon() {
  return {};
}

addon.resolve = function() {
  return "";
};

addon.host = "browser";

module.exports = addon;
