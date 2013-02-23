define(['backbone-events'], function(Events){
  var Events = require('backbone-events');

  var _extend = function(obj) {
    Array.prototype.forEach.call(Array.prototype.slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  var idCounter = 0, uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  var View = (function(){
    var constructor = function(options) {
      this.cid = uniqueId('view');
      this._configure(options || {});
      this._ensureElement();
      this.initialize.apply(this, arguments);
      this.delegatedEvents = [];
      this.delegateEvents();
    };

    // Cached regex to split keys for `delegate`.
    var eventSplitter = /^(\S+)\s*(.*)$/;

    // List of view options to be merged as properties.
    var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

    // Set up all inheritable **Backbone.View** properties and methods.
    _extend(constructor.prototype, {
      // The default `tagName` of a View's element is `"div"`.
      tagName: 'div',
      $: function(selector) {
        return this.el.querySelectorAll(selector);
      },
      initialize: function(){},
      render: function() {
        return this;
      },
      remove: function() {
        this.el.parentElement.removeChild(this.el);
        return this;
      },
      make: function(tagName, attributes, content) {
        var el = document.createElement(tagName);
        if (attributes) for (var k in attributes) el.setAttribute(k, attributes[k]);
        if (content){
          if (typeof content == "object") content.appendChild(content);
          else content.innerHTML = content;
        }
        return el;
      },
      setElement: function(element, delegate) {
        this.el = element;
        if (delegate !== false) this.delegateEvents();
        return this;
      },
      delegateEvents: function(events) {
        if (!(events || (events = getValue(this, 'events')))) return;
        this.undelegateEvents();
        for (var key in events) {
          var method = events[key];
          if (typeof method != "function") method = this[events[key]];
          if (!method) throw new Error('Event "' + events[key] + '" does not exist');
          var match = key.match(eventSplitter);
          var eventName = match[1], selector = match[2];
          method = method.bind(this);
          if (selector === '') {
            this.el.addEventListener(eventName, method);
            this.delegatedEvents.push({
              el: this.el
            , event: eventName
            , method: method
            });
          } else {
            var els = this.el.querySelectorAll(selector);
            for (var i = 0; i < els.length; i++){
              els[i].addEventListener(eventName, method);
              this.delegatedEvents.push({
                el: els[i]
              , event: eventName
              , method: method
              });
            }
          }
        }
      },
      undelegateEvents: function() {
        if (this.delegatedEvents.length == 0) return;
        for (var i = 0, d; i < this.delegatedEvents.length; i++){
          d = this.delegatedEvents[i];
          d.el.removeEventListener(d.event, d.method);
        }
        this.delegatedEvents = [];
      },
      _configure: function(options) {
        if (this.options) options = _extend({}, this.options, options);
        for (var i = 0, l = viewOptions.length; i < l; i++) {
          var attr = viewOptions[i];
          if (options[attr]) this[attr] = options[attr];
        }
        this.options = options;
      },
      _ensureElement: function() {
        if (!this.el) {
          var attrs = _extend({}, getValue(this, 'attributes'));
          if (this.id) attrs.id = this.id;
          if (this.className) attrs['class'] = this.className;
          this.setElement(this.make(getValue(this, 'tagName'), attrs), false);
        } else {
          this.setElement(this.el, false);
        }
      }
    }, Events);
    return constructor;
  })();


  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return (typeof object[prop] === "function") ? object[prop]() : object[prop];
  };

  View.extend = function(protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  return View;
});