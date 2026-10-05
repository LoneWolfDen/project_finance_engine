// App state (STO-004; TARGET_ARCHITECTURE §5). Registers CFE.state and CFE.actions; needs app/cfe.js.
//
//   CFE.state.published   // null, or {manifest, dataset, check} after the loader ran (read only for views)
//   CFE.state.session     // {route}
//   CFE.state.ui          // view state that is not data
//   CFE.actions.setPublished(result)   // the only way to change state.published; notifies subscribers
//   CFE.actions.subscribe(fn)          // fn(state, change) after every action; returns an unsubscribe function
(function (CFE) {
  'use strict';

  var listeners = [];

  CFE.state = { published: null, session: { route: null }, ui: {} };

  function notify(change) {
    listeners.slice().forEach(function (fn) { fn(CFE.state, change); });
  }

  CFE.actions = {
    setPublished: function (published) {
      CFE.state.published = published || null;
      notify('published');
    },
    setRoute: function (route) {
      CFE.state.session.route = route;
      notify('route');
    },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    }
  };
})(CFE);
