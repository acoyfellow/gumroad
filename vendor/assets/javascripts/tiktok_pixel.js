export default function loadTiktokPixelScript() {
  (function(w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function(target, method) {
      target[method] = function() {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function(id) {
      for (var instance = ttq._i[id] || [], j = 0; j < ttq.methods.length; j++) ttq.setAndDefer(instance, ttq.methods[j]);
      return instance;
    };
    ttq.load = function(id, config) {
      var src = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = src;
      ttq._t = ttq._t || {};
      ttq._t[id] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[id] = config || {};
      var script = d.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = src + "?sdkid=" + id + "&lib=" + t;
      var firstScript = d.getElementsByTagName("script")[0];
      firstScript.parentNode.insertBefore(script, firstScript);
    };
  }(window, document, "ttq"));
}
