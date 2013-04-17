
var _ = require('underscore');

Metal = {};

Metal.Descriptor = function() {};

Metal.wrap = function wrap(func, superFunc) {

    function X() {}

    function superWrapper() {
      var ret, sup = this.__super;
      this.__super = superFunc || X;
      ret = func.apply(this, arguments);
      this.__super = sup;
      return ret;
    }

    superWrapper.wrappedFunction = func;

    return superWrapper;

}

var lookup = Metal.lookup || this;

var MANDATORY_SETTER_FUNCTION = Metal.MANDATORY_SETTER_FUNCTION = function(value) {
    console.log('You must use [object].set() to access this property (of ' + this + ')');
};

var DEFAULT_GETTER_FUNCTION = Metal.DEFAULT_GETTER_FUNCTION = function(name) {
    return function() {
        var meta = this[META_KEY];
        return meta && meta.values[name];
    };
};

var undefinedDescriptor = Metal.undefinedDescriptor = {
  configurable: true,
  writable: true,
  enumerable: false,
  value: undefined
};

var uuid = Metal.uuid = 0;

var generateUUID = Metal.generateUUID = function(obj, prefix) { 
    if (!prefix) prefix = 'hoser';
    var ret = (prefix + (uuid++));
    if (obj) {
        UUID_DESC.value = ret;
        Metal.defineProperty(obj, UUID_KEY, UUID_DESC);
    }
    return ret ;
};

var UUID_DESC = {
  writable:    true,
  configurable: false,
  enumerable:  false,
  value: null
};

var META_DESC = {
  writable:    true,
  configurable: false,
  enumerable:  false,
  value: null
};

var EMPTY_META = {
  descriptors: {},
  watching: {}
};

var STUB_DESC = new Metal.Descriptor();

var UUID_KEY = Metal.UUID_KEY = '__hoser' + (+ new Date());

var META_KEY = Metal.UUID_KEY+'_meta';
var numberCache = [];
var stringCache  = {};

Metal.uuidFor = function uuidFor(obj) {

    //var uuid = generateUUID();
    // special cases where we don't want to add a key to object
    if (obj === undefined) return "(undefined)";
    if (obj === null) return "(null)";

    var cache, ret;
    var type = typeof obj;

    // Don't allow prototype changes to String etc. to change the guidFor
    switch(type) {
    case 'number':
        ret = Metal.numberCache[obj];
        if (!ret) ret = Metal.numberCache[obj] = 'nu_'+obj;
        return ret;

    case 'string':
        ret = Metal.stringCache[obj];
        if (!ret) ret = Metal.stringCache[obj] = 'st_'+(uuid);
        return ret;

    case 'boolean':
        return obj ? '(true)' : '(false)';

    default:
        if (obj[uuid]) return obj[uuid];
        if (obj === Object) return '(Object)';
        if (obj === Array)  return '(Array)';
        ret = 'hoser'+(uuid++);
        UUID_DESC.value = ret;
        Object.defineProperty(obj, uuid, UUID_DESC);
        return ret;
    }
};

var metaFor = Metal.meta = function(obj, writable) {

    var ret = obj[META_KEY];
    // console.log('meta key for obj ' + META_KEY);
    // console.log('... in ...')
    // console.log(ret);

    if (writable===false) return ret || EMPTY_META;

    if (!ret) {
        Object.defineProperty(obj, META_KEY, META_DESC);
        ret = new Meta(obj);
        obj[META_KEY] = ret;
    } else if (ret.source !== obj) {
        Object.defineProperty(obj, META_KEY, META_DESC);
        ret = Object.create(ret);
        ret.descriptors    = Object.create(ret.descriptors);
        ret.watching = Object.create(ret.watching);
        ret.cache    = {};
        ret.source   = obj;
        obj[META_KEY] = ret;
    }
    // console.log('... out ...');
    // console.log(ret);
    return ret;
};

function Meta(obj) {
    this.descriptors = {};
    this.watching = {};
    this.cache = {};
    this.source = obj;
}

Mixin = function() { return initMixin(this, arguments); };

Mixin._initProperties = function(args) { initProperties = args; };


function initMixin(mixin, args) {
  if (args && args.length > 0) {
    mixin.mixins = arrayMap.call(args, function(x) {
      if (x instanceof Mixin) { return x; }

      // Note: Manually setup a primitive mixin here. This is the only
      // way to actually get a primitive mixin. This way normal creation
      // of mixins will give you combined mixins...
      var mixin = new Mixin();
      mixin.properties = x;
      return mixin;
    });
  }
// if(mixin && mixin.mixins && mixin.mixins.length && mixin.mixins.length > 0) {
//   var test = mixin.mixins[0];
//   if(
//       test.hasOwnProperty('properties')
//       && test.properties.hasOwnProperty('ClassMixin')
//   ) { 
//       console.log(test.properties);
//   }
// }
  return mixin;
}

/**
  @private

  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked. This is the primitive we use to implement
  calls to super.

  @method wrap
  @for Ember
  @param {Function} func The function to call
  @param {Function} superFunc The super function.
  @return {Function} wrapped function.
*/
Metal.wrap = function(func, superFunc) {
  function K() {}
  
  function superWrapper() {
    var ret, sup = this._super;
    this._super = superFunc || K;
    ret = func.apply(this, arguments);
    this._super = sup;
    return ret;
  }

  superWrapper.wrappedFunction = func;
  superWrapper.__hoser_observes__ = func.__hoser_observes__;
  superWrapper.__hoser_observesBefore__ = func.__hoser_observesBefore__;

  return superWrapper;
};

/**
  Returns true if the passed object is an array or Array-like.

  Ember Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike `Ember.typeOf` this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements `Ember.Array`)

  ```javascript
  Ember.isArray();                                            // false
  Ember.isArray([]);                                          // true
  Ember.isArray( Ember.ArrayProxy.create({ content: [] }) );  // true
  ```

  @method isArray
  @for Ember
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
*/
Metal.isArray = function(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if ((obj.length !== undefined) && 'object'===typeof obj) { return true; }
  return false;
};

/**
  Forces the passed object to be part of an array. If the object is already
  an array or array-like, returns the object. Otherwise adds the object to
  an array. If obj is `null` or `undefined`, returns an empty array.

  ```javascript
  Ember.makeArray();                           // []
  Ember.makeArray(null);                       // []
  Ember.makeArray(undefined);                  // []
  Ember.makeArray('lindsay');                  // ['lindsay']
  Ember.makeArray([1,2,42]);                   // [1,2,42]

  var controller = Ember.ArrayProxy.create({ content: [] });
  Ember.makeArray(controller) === controller;  // true
  ```

  @method makeArray
  @for Ember
  @param {Object} obj the object
  @return {Array}
*/
Metal.makeArray = function(obj) {
  if (obj === null || obj === undefined) { return []; }
  return Metal.isArray(obj) ? obj : [obj];
};
// Testing this is not ideal, but we want to use native functions
// if available, but not to use versions created by libraries like Prototype
var isNativeFunc = function(func) {
  // This should probably work in all browsers likely to have ES5 array methods
  return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
};

var a_forEach = function(obj, callback, thisArg) {
    return obj.forEach ? obj.forEach.call(obj, callback, thisArg) : Array.prototype.forEach.call(obj, callback, thisArg);
}

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
var arrayMap = isNativeFunc(Array.prototype.map) ? Array.prototype.map : function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null) {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") {
    throw new TypeError();
  }

  var res = new Array(len);
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) {
      res[i] = fun.call(thisp, t[i], i, t);
    }
  }

  return res;
};

function updateObservers(obj, key, observer, observerKey, method) {
  if ('function' !== typeof observer) { return; }

  var paths = observer[observerKey];

  if (paths) {
    for (var i=0, l=paths.length; i<l; i++) {
      Metal[method](obj, paths[i], null, key);
    }
  }
}

function replaceObservers(obj, key, observer) {
    var prevObserver = obj[key];

    updateObservers(obj, key, prevObserver, '__hoser_observesBefore__', 'removeBeforeObserver');
    updateObservers(obj, key, prevObserver, '__hoser_observes__', 'removeObserver');

    updateObservers(obj, key, observer, '__hoser_observesBefore__', 'addBeforeObserver');
    updateObservers(obj, key, observer, '__hoser_observes__', 'addObserver');
}

var IS_BINDING = Metal.IS_BINDING = /^.+Binding$/;

function detectBinding(obj, key, value, m) {
    if (IS_BINDING.test(key)) {
        var bindings = m.bindings;
        if (!bindings) {
            bindings = m.bindings = {};
        } else if (!m.hasOwnProperty('bindings')) {
            bindings = m.bindings = Object.create(m.bindings);
        }
        bindings[key] = value;
    }
}

Metal.foopy = boopy = 0;
function applyMixin(obj, mixins, partial) {
    var descs = {}, values = {}, m = Metal.meta(obj),
    key, value, desc;

    // Go through all mixins and hashes passed in, and:
    //
    // * Handle concatenated properties
    // * Set up _super wrapping if necessary
    // * Set up computed property descriptors
    // * Copying `toString` in broken browsers
    mergeMixins(mixins, mixinsMeta(obj), descs, values, obj);

    for(key in values) {
        if (key === 'contructor' || !values.hasOwnProperty(key)) { continue; }

        desc = descs[key];
        value = values[key];

        if (desc === REQUIRED) { continue; }

        while (desc && desc instanceof Alias) {
            var followed = followAlias(obj, desc, m, descs, values);
            desc = followed.desc;
            value = followed.value;
        }

        if (desc === undefined && value === undefined) { continue; }

        replaceObservers(obj, key, value);
        detectBinding(obj, key, value, m);
        defineProperty(obj, key, desc, value, m);
    }

    if (!partial) { // don't apply to prototype
        finishPartial(obj, m);
    }

    return obj;
}

function mixinsMeta(obj) {
    var m = Metal.meta(obj, true), ret = m.mixins;
    if (!ret) {
        ret = m.mixins = {};
    } else if (!m.hasOwnProperty('mixins')) {
        ret = m.mixins = Object.create(ret);
    }

    return ret;
}

/**
  @private

  Call on an object when you first beget it from another object. This will
  setup any chained watchers on the object instance as needed. This method is
  safe to call multiple times.

  @method rewatch
  @for Ember
  @param obj
*/
var rewatch = Metal.rewatch = function(obj) {
    var m = metaFor(obj, false), chains = m.chains;

    // make sure the object has its own guid.
    if (UUID_KEY in obj && !obj.hasOwnProperty(UUID_KEY)) {
        Metal.generateUUID(obj, 'hoser');
    }

    // make sure any chained watchers update.
    if (chains && chains.value() !== obj) {
        m.chains = chains.copy(obj);
    }

    return this;
};

/**
  @method mixin
  @for Metal
  @param obj
  @param mixins*
  @return obj
*/
Metal.mixin = function(obj) {
    var args = a_slice.call(arguments, 1);
    applyMixin(obj, args, false);
    return obj;
};

/**
  The `Metal.Mixin` class allows you to create mixins, whose properties can be
  added to other classes. For instance,

  ```javascript
  App.Editable = Metal.Mixin.create({
    edit: function() {
      console.log('starting to edit');
      this.set('isEditing', true);
    },
    isEditing: false
  });

  // Mix mixins into classes by passing them as the first arguments to
  // .extend or .create.
  App.CommentView = Metal.View.extend(App.Editable, {
    template: Metal.Handlebars.compile('{{#if isEditing}}...{{else}}...{{/if}}')
  });

  commentView = App.CommentView.create();
  commentView.edit(); // outputs 'starting to edit'
  ```

  Note that Mixins are created with `Metal.Mixin.create`, not
  `Metal.Mixin.extend`.

  @class Mixin
  @namespace Metal
*/
Metal.Mixin = function() { return initMixin(this, arguments); };

Mixin = Metal.Mixin;

Mixin._apply = applyMixin;

Mixin.applyPartial = function(obj) {
    var args = a_slice.call(arguments, 1);
    return applyMixin(obj, args, true);
};

function finishPartial(obj, m) {
    //connectBindings(obj, m || Metal.meta(obj));
    return obj;
}

Mixin.finishPartial = finishPartial;

Mixin.finishChains = function(obj) {
    var m = metaFor(obj, false), chains = m.chains;
    if (chains) {
        if (chains.value() !== obj) {
            m.chains = chains = chains.copy(obj);
        }
        chains.didChange(true);
    }
};

Metal.anyUnprocessedMixins = false;

/**
  Creates an instance of a class. Accepts either no arguments, or an object
  containing values to initialize the newly instantiated object with.

  ```javascript
  App.Person = Metal.Object.extend({
    helloWorld: function() {
      alert("Hi, my name is " + this.get('name'));
    }
  });

  var tom = App.Person.create({
    name: 'Tom Dale'
  });

  tom.helloWorld(); // alerts "Hi, my name is Tom Dale".
  ```

  `create` will call the `init` function if defined during
  `Metal.AnyObject.extend`

  If no arguments are passed to `create`, it will not set values to the new
  instance during initialization:

  ```javascript
  var noName = App.Person.create();
  noName.helloWorld(); // alerts undefined
  ```

  NOTE: For performance reasons, you cannot declare methods or computed
  properties during `create`. You should instead declare methods and computed
  properties when using `extend`.

  @method create
  @static
  @param arguments*
*/
Mixin.create = function() {
  Metal.anyUnprocessedMixins = true;
  var M = this;
  return initMixin(new M(), arguments);
};

var MixinPrototype = Mixin.prototype;

/**
  @method reopen
  @param arguments*
*/
MixinPrototype.reopen = function() {
  var mixin, tmp;
  
  if (this.properties) {
    mixin = Mixin.create();
    mixin.properties = this.properties;
    delete this.properties;
    this.mixins = [mixin];
  } else if (!this.mixins) {
    this.mixins = [];
  }

  var len = arguments.length, mixins = this.mixins, idx;

  for(idx=0; idx < len; idx++) {
    mixin = arguments[idx];
    //console.log('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(mixin), typeof mixin === 'object' && mixin !== null && Object.prototype.toString.call(mixin) !== '[object Array]');

    if (mixin instanceof Mixin) {
      mixins.push(mixin);
    } else {
      tmp = Mixin.create();
      tmp.properties = mixin;
      mixins.push(tmp);
    }
  }

  return this;
};

/**
  @method apply
  @param obj
  @return applied object
*/
MixinPrototype.apply = function(obj) {
  return applyMixin(obj, [this], false);
};

MixinPrototype.applyPartial = function(obj) {
  return applyMixin(obj, [this], true);
};

function _detect(curMixin, targetMixin, seen) {
  var guid = guidFor(curMixin);

  if (seen[guid]) { return false; }
  seen[guid] = true;

  if (curMixin === targetMixin) { return true; }
  var mixins = curMixin.mixins, loc = mixins ? mixins.length : 0;
  while (--loc >= 0) {
    if (_detect(mixins[loc], targetMixin, seen)) { return true; }
  }
  return false;
}

/**
  @method detect
  @param obj
  @return {Boolean}
*/
MixinPrototype.detect = function(obj) {
  if (!obj) { return false; }
  if (obj instanceof Mixin) { return _detect(obj, this, {}); }
  var mixins = Metal.meta(obj, false).mixins;
  if (mixins) {
    return !!mixins[guidFor(this)];
  }
  return false;
};

MixinPrototype.without = function() {
  var ret = new Mixin(this);
  ret._without = a_slice.call(arguments);
  return ret;
};

function _keys(ret, mixin, seen) {
  if (seen[guidFor(mixin)]) { return; }
  seen[guidFor(mixin)] = true;

  if (mixin.properties) {
    var props = mixin.properties;
    for (var key in props) {
      if (props.hasOwnProperty(key)) { ret[key] = true; }
    }
  } else if (mixin.mixins) {
    a_forEach.call(mixin.mixins, function(x) { _keys(ret, x, seen); });
  }
}

MixinPrototype.keys = function() {
  var keys = {}, seen = {}, ret = [];
  _keys(keys, this, seen);
  for(var key in keys) {
    if (keys.hasOwnProperty(key)) { ret.push(key); }
  }
  return ret;
};

// returns the mixins currently applied to the specified object
// TODO: Make Metal.mixin
Mixin.mixins = function(obj) {
  var mixins = Metal.meta(obj, false).mixins, ret = [];

  if (!mixins) { return ret; }

  for (var key in mixins) {
    var mixin = mixins[key];

    // skip primitive mixins since these are always anonymous
    if (!mixin.properties) { ret.push(mixin); }
  }

  return ret;
};

REQUIRED = new Metal.Descriptor();
REQUIRED.toString = function() { return '(Required Property)'; };

/**
  Denotes a required property for a mixin

  @method required
  @for Metal
*/
Metal.required = function() {
  return REQUIRED;
};

// var MixinPrototype = Mixin.prototype;
// 
// /**
//   @method reopen
//   @param arguments*
// */
// MixinPrototype.reopen = function() {
// var mixin, tmp;
// 
// if (this.properties) {
// mixin = Mixin.create();
// mixin.properties = this.properties;
// delete this.properties;
// this.mixins = [mixin];
// } else if (!this.mixins) {
// this.mixins = [];
// }
// 
// var len = arguments.length, mixins = this.mixins, idx;
// 
// for(idx=0; idx < len; idx++) {
// mixin = arguments[idx];
// console.log('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(mixin), typeof mixin === 'object' && mixin !== null && Object.prototype.toString.call(mixin) !== '[object Array]');
// 
// if (mixin instanceof Mixin) {
// mixins.push(mixin);
// } else {
// tmp = Mixin.create();
// tmp.properties = mixin;
// mixins.push(tmp);
// }
// }
// 
// return this;
// };
// 
// /**
//   @method apply
//   @param obj
//   @return applied object
// */
// MixinPrototype.apply = function(obj) {
//   return applyMixin(obj, [this], false);
// };
// 
// MixinPrototype.applyPartial = function(obj) {
//   return applyMixin(obj, [this], true);
// };
// 
// function _detect(curMixin, targetMixin, seen) {
//   var uuid = uuidFor(curMixin);
// 
//   if (seen[uuid]) { return false; }
//   seen[uuid] = true;
// 
//   if (curMixin === targetMixin) { return true; }
//   var mixins = curMixin.mixins, loc = mixins ? mixins.length : 0;
//   while (--loc >= 0) {
//     if (_detect(mixins[loc], targetMixin, seen)) { return true; }
//   }
//   return false;
// }
// 
// /**
//   @method detect
//   @param obj
//   @return {Boolean}
// */
// MixinPrototype.detect = function(obj) {
//   if (!obj) { return false; }
//   if (obj instanceof Mixin) { return _detect(obj, this, {}); }
//   var mixins = Metal.meta(obj, false).mixins;
//   if (mixins) {
//     return !!mixins[uuidFor(this)];
//   }
//   return false;
// };
// 
// MixinPrototype.without = function() {
//   var ret = new Mixin(this);
//   ret._without = a_slice.call(arguments);
//   return ret;
// };
// 
// function _keys(ret, mixin, seen) {
//   if (seen[uuidFor(mixin)]) { return; }
//   seen[uuidFor(mixin)] = true;
// 
//   if (mixin.properties) {
//     var props = mixin.properties;
//     for (var key in props) {
//       if (props.hasOwnProperty(key)) { ret[key] = true; }
//     }
//   } else if (mixin.mixins) {
//     _.each(mixin.mixins, function(a,b,c) { _keys(ret, a, seen); });
//   }
// }
// 
// MixinPrototype.keys = function() {
//   var keys = {}, seen = {}, ret = [];
//   _keys(keys, this, seen);
//   for(var key in keys) {
//     if (keys.hasOwnProperty(key)) { ret.push(key); }
//   }
//   return ret;
// };

Metal.giveDescriptorSuper = function giveDescriptorSuper(meta, key, value, values, descs) {
    var superProperty;

    // Computed properties override methods, and do not call super to them
    if (values[key] === undefined) {
        // Find the original descriptor in a parent mixin
        superProperty = descs[key];
    }

    // If we didn't find the original descriptor in a parent mixin, find
    // it on the original object.
    superProperty = superProperty || meta.descs[key];

    if (!superProperty) {
      return property;
    }

    // Since multiple mixins may inherit from the same parent, we need
    // to clone the computed property so that other mixins do not receive
    // the wrapped version.
    property = Object.create(property);
    property.func = Metal.wrap(property.func, superProperty.func);

    return property;
    
}

Metal.giveMethodSuper = function giveMethodSuper(obj, key, method, values, descscriptors) { 
    var superMethod;

    // Methods overwrite computed properties, and do not call super to them.
    if (descscriptors[key] === undefined) {
      // Find the original method in a parent mixin
      superMethod = values[key];
    }

    // If we didn't find the original value in a parent mixin, find it in
    // the original object
    superMethod = superMethod || obj[key];
    // console.log(superMethod + '----++++');
    
    // Only wrap the new method if the original method was a function
    if ('function' !== typeof superMethod) {
        // console.log(key);
        // console.log(superMethod + " ")
      return method;
    }
    
    return Metal.wrap(method, superMethod);
    
}

Metal.applyConcatenatedProperties = function applyConcatenatedProperties(base, key, value, values) { return value; }

var addNormalizedProperty = Metal.addNormalizedProperty = function(base, key, value, meta, descs, values, concats) {

    if (value instanceof Metal.Descriptor) {

        if (value === STUB_DESC && descs[key]) { return {}; }

        // Wrap descriptor function to implement
        // _super() if needed
        if (value.func) {
            value = giveDescriptorSuper(meta, key, value, values, descs);
        }

        descs[key]  = value;
        values[key] = undefined;
    } else {
        
        // impl super if needed...
        if (isMethod(value)) {
            value = Metal.giveMethodSuper(base, key, value, values, descs);
        } else if ((concats && _.indexOf(concats, key) >= 0) || key === 'concatenatedProperties') {
            value = Metal.applyConcatenatedProperties(base, key, value, values);
        }
        
        descs[key] = undefined;
        values[key] = value;
    }
}

var isMethod = Mixin.isMethod = function(obj) {
    return 'function' === typeof obj &&
        obj.isMethod !== false &&
        obj !== Boolean && obj !== Object && obj !== Number && obj !== Array && obj !== Date && obj !== String;
}

var mixinProperties = Mixin.mixinProperties = function(mixinsMeta, mixin) {
    var uuid;
    if (mixin instanceof Mixin) {
        uuid = Metal.uuidFor(mixin);
        
        
        // console.log(uuid);
        // console.log(mixinsMeta[uuid]);
        // console.log(mixin.properties);
        // console.log('bazmo');
        
        if (mixinsMeta[uuid]) { return {}; }
        mixinsMeta[uuid] = mixin;        
        return mixin.properties;
    } else {
        return mixin; // apply anonymous mixin properties
    }
}

function concatenatedProperties(props, values, base) {
  var concats;

  // reset before adding each new mixin to pickup concats from previous
  concats = values.concatenatedProperties || base.concatenatedProperties;
  if (props.concatenatedProperties) {
    concats = concats ? concats.concat(props.concatenatedProperties) : props.concatenatedProperties;
  }

  return concats;
}

function mergeMixins(mixins, m, descs, values, base) {
  var mixin, props, key, concats, meta;

  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }
  
  for(var i=0, l=mixins.length; i<l; i++) {
    mixin = mixins[i];
    // console.log('------------');
    // console.log(mixin);
    // console.log('------------');
    props = mixinProperties(m, mixin);
    if (props === {}) { continue; }

    if (props) {
        // console.log('props');
        // console.log(props);
        
      meta = Metal.meta(base);
      concats = concatenatedProperties(props, values, base);
      for (key in props) {
        if (!props.hasOwnProperty(key)) { continue; }
        addNormalizedProperty(base, key, props[key], meta, descs, values, concats);
      }
      // console.log('descs');
      // console.log(descs);
      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) { base.toString = props.toString; }
    } else if (mixin.mixins) {
      mergeMixins(mixin.mixins, m, descs, values, base);
      if (mixin._without) { a_forEach.call(mixin._without, removeKeys); }
    }
  }
}

// var mergeMixins = Mixin.mergeMixins = function(mixin, ensured_object, descriptors, values, object) {
//     var props, key, concats, meta;
// 
//     function removeKeys(keyName) {
//         delete descs[keyName];
//         delete values[keyName];
//     }
// 
//     _.each(mixin.mixins, function(a,b,c) {
//         var mixin = a;
//         
//         props = mixinProperties(ensured_object, mixin);
//         if(props) {
//              meta = Metal.meta(object);
// 
//              _.each(props, function(aa,bb,cc) {
//                  
//                  if(_.has(props,bb)) {
//                      addNormalizedProperty(object, bb, aa, meta, descriptors, values);
//                  }
// 
// 
//             }, this);
//             
//             // Copy non-enumerated toString method, if exists on current mixin
//             if (_.has(props,'toString')) { object.toString = props.toString; }
//         
//         } else if (mixin.mixins) {
//             
//             mergeMixins(mixin.mixins, ensured_object, descriptors, values, object);
//             
//         }
// 
//     }, this);
// 
// }

Metal.get = function get(obj, keyName) {
  // Helpers that operate with 'this' within an #each
  if (keyName === '') {
    return obj;
  }

  if (!keyName && 'string'===typeof obj) {
    keyName = obj;
    obj = null;
  }

  if (!obj || keyName.indexOf('.') !== -1) {
    if(obj === undefined) console.log("Cannot call get with '"+ keyName +"' on an undefined object.");
    return getPath(obj, keyName);
  }

  if(!obj && keyName) console.log("You need to provide an object and key to `get`.");

  var meta = obj[META_KEY], desc = meta && meta.descriptors[keyName], ret;

  if (desc) {
    return desc.get(obj, keyName);
  } else {
    if (meta && meta.watching[keyName] > 0) {
      ret = meta.values[keyName];
    } else {
      ret = obj[keyName];
    }

    if (ret === undefined &&
        'object' === typeof obj && !(keyName in obj) && 'function' === typeof obj.unknownProperty) {
      return obj.unknownProperty(keyName);
    }

    return ret;
  }
};
// Regex for determining if a string is a path, use like
//      IS_PATH.test(my_string);
var IS_PATH = /[\.\*]/;

// Use first_key like:
//      var name = path.match(FIRST_KEY)[0];
//  to get the top-level object name (TODO enforce namespace?)
var FIRST_KEY = /^([^\.\*]+)/;

// Regex for detecting objects in the global namespace
//  Use like:
//      IS_GLOBAL.test(obj))
var IS_GLOBAL = /^([A-Z$]|([0-9][A-Z$]))/;
var IS_GLOBAL_PATH = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]/;

var HAS_THIS  = /^this[\.\*]/;

Metal.set = function set(obj, keyName, value, tolerant) {
    //console.log(obj);
    
  if (typeof obj === 'string') {
    if(IS_GLOBAL.test(obj)) console.log("Path '" + obj + "' must be global if no obj is given.");
    value = keyName;
    keyName = obj;
    obj = null;
  }

  if (!obj || keyName.indexOf('.') !== -1) {
    return setPath(obj, keyName, value, tolerant);
  }

  if(!!obj && keyName === undefined) console.log("You need to provide an object and key to `set`.");
  if(obj.isDestroyed) console.log('calling set on destroyed object');

  var meta = obj[META_KEY], desc = meta && meta.descriptors[keyName],
      isUnknown, currentValue;
  if (desc) {
    desc.set(obj, keyName, value);
  } else {
    isUnknown = 'object' === typeof obj && !(keyName in obj);

    // setUnknownProperty is called if `obj` is an object,
    // the property does not already exist, and the
    // `setUnknownProperty` method exists on the object
    if (isUnknown && 'function' === typeof obj.setUnknownProperty) {
      obj.setUnknownProperty(keyName, value);
    } else if (meta && meta.watching[keyName] > 0) {
        currentValue = obj[keyName];
      // only trigger a change if the value has changed
      if (value !== currentValue) {
        obj[keyName] = value;
      }
    } else {
      obj[keyName] = value;
    }
  }
  return value;
};

function getPath(root, path) {
  var hasThis, parts, tuple, idx, len;

  // If there is no root and path is a key name, return that
  // property from the current object.
  //console.log(path);
  if (root === null && path.indexOf('.') === -1) { return Metal.get(this, path); }

  // detect complicated paths and normalize them
  hasThis  = HAS_THIS.test(path);

  if (!root || hasThis) {
    tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
    tuple.length = 0;
  }

  parts = path.split(".");
  len = parts.length;
  for (idx=0; root && idx<len; idx++) {
    root = Metal.get(root, parts[idx], true);
    if (root && root.isDestroyed) { return undefined; }
  }
  return root;
}

function setPath(root, path, value, tolerant) {
  var keyName;

  // get the last part of the path
  keyName = path.slice(path.lastIndexOf('.') + 1);

  // get the first part of the part
  path = path.slice(0, path.length-(keyName.length+1));

  // unless the path is this, look up the first part to
  // get the root
  if (path !== 'this') {
    root = getPath(root, path);
  }

  if (!keyName || keyName.length === 0) {
    throw new Error('You passed an empty path');
  }

  if (!root) {
    if (tolerant) { return; }
    else { throw new Error('Object in path '+path+' could not be found or was destroyed.'); }
  }

  return Metal.set(root, keyName, value);
}

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

// assumes path is already normalized
function normalizeTuple(target, path) {
  var hasThis  = HAS_THIS.test(path),
      isGlobal = !hasThis && IS_GLOBAL_PATH.test(path),
      key;

  if (!target || isGlobal) target = Metal.lookup;
  if (hasThis) path = path.slice(5);

  if (target === Metal.lookup) {
    key = firstKey(path);
    target = get(target, key);
    path   = path.slice(key.length+1);
  }

  // must return some kind of path to be valid else other things will break.
  if (!path || path.length===0) throw new Error('Invalid Path');

  return [ target, path ];
}

var defineProperty = Metal.defineProperty = function(obj, keyName, descriptor, data, meta) {
    var descriptors, existingDesc, watching, value;

    if (!meta) meta = metaFor(obj);
    descriptors = meta.descriptors;
    existingDesc = meta.descriptors[keyName];
    watching = meta.watching[keyName] > 0;

    if (existingDesc instanceof Metal.Descriptor) {
        // WARNING ComputedPropertyPrototype object notions here... 
        //  ... computed proroerties have a bunch of extras that aren't
        //  in play in Metal since bindings and watching are minimized
        //  near to the point of non-existence.  That being said, some
        //  notion of teardown is important...  TODO
        //existingDesc.teardown(obj, keyName);
    }

    if (descriptor instanceof Metal.Descriptor) {
        value = descriptor;
        descriptors[keyName] = descriptor;
        if (watching) {
            Object.defineProperty(obj, keyName, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: undefined // make enumerable
            });
        } else {
            obj[keyName] = undefined; // make enumerable
        }        
        descriptor.setup(obj, keyName);
    } else {
        descriptors[keyName] = undefined; // shadow descriptor in proto
        if (descriptor == null) {
            value = data;
            // //console.log(descriptor);
            // console.log(keyName);
            // console.log(meta);
            if (watching) {
                meta.values[keyName] = data;
                Object.defineProperty(obj, keyName, {
                    configurable: true,
                    enumerable: true,
                    set: MANDATORY_SETTER_FUNCTION,
                    get: DEFAULT_GETTER_FUNCTION(keyName)
                });
            } else {
                obj[keyName] = data;
            }
        } else {
            value = descriptor;
            Object.defineProperty(obj, keyName, descriptor);
        }
    }

    // if key is being watched, override chains that
    // were initialized with the prototype
    //if (watching) { Metal.overrideChains(obj, keyName, meta); }

    // The `value` passed to the `didDefineProperty` hook is
    // either the descriptor or data, whichever was passed.
    //if (obj.didDefineProperty) { obj.didDefineProperty(obj, keyName, value); }

    return this;
};



Alias = function(methodName) {
  this.methodName = methodName;
};
Alias.prototype = new Metal.Descriptor();

function followAlias(obj, descriptor, m, descriptors, values) {
  var altKey = descriptor.methodName, value;
  if (descriptors[altKey] || values[altKey]) {
    value = values[altKey];
    descriptor  = descriptors[altKey];
  } else if (m.descriptors[altKey]) {
    descriptor  = m.descriptors[altKey];
    value = undefined;
  } else {
    descriptor = undefined;
    value = obj[altKey];
  }

  return { descriptor: desc, value: value };
}

/**
  @class ComputedProperty
  @namespace Metal
  @extends Metal.Descriptor
  @constructor
*/
function ComputedProperty(func, opts) {
  this.func = func;

  this._cacheable = (opts && opts.cacheable !== undefined) ? opts.cacheable : true;
  this._dependentKeys = opts && opts.dependentKeys;
  this._readOnly = opts && (opts.readOnly !== undefined || !!opts.readOnly);
}

Metal.ComputedProperty = ComputedProperty;
ComputedProperty.prototype = new Metal.Descriptor();

var ComputedPropertyPrototype = ComputedProperty.prototype;

/**
  Call on a computed property to set it into cacheable mode. When in this
  mode the computed property will automatically cache the return value of
  your function until one of the dependent keys changes.

  ```javascript
  MyApp.president = Metal.Object.create({
    fullName: function() {
      return this.get('firstName') + ' ' + this.get('lastName');

      // After calculating the value of this function, Metal will
      // return that value without re-executing this function until
      // one of the dependent properties change.
    }.property('firstName', 'lastName')
  });
  ```

  Properties are cacheable by default.

  @method cacheable
  @param {Boolean} aFlag optional set to `false` to disable caching
  @return {Metal.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.cacheable = function(aFlag) {
  this._cacheable = aFlag !== false;
  return this;
};

/**
  Call on a computed property to set it into non-cached mode. When in this
  mode the computed property will not automatically cache the return value.

  ```javascript
  MyApp.outsideService = Metal.Object.create({
    value: function() {
      return OutsideService.getValue();
    }.property().volatile()
  });
  ```

  @method volatile
  @return {Metal.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.volatile = function() {
  return this.cacheable(false);
};

/**
  Call on a computed property to set it into read-only mode. When in this
  mode the computed property will throw an error when set.

  ```javascript
  MyApp.person = Metal.Object.create({
    guid: function() {
      return 'guid-guid-guid';
    }.property().readOnly()
  });

  MyApp.person.set('guid', 'new-guid'); // will throw an exception
  ```

  @method readOnly
  @return {Metal.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.readOnly = function(readOnly) {
  this._readOnly = readOnly === undefined || !!readOnly;
  return this;
};

/**
  Sets the dependent keys on this computed property. Pass any number of
  arguments containing key paths that this computed property depends on.

  ```javascript
  MyApp.president = Metal.Object.create({
    fullName: Metal.computed(function() {
      return this.get('firstName') + ' ' + this.get('lastName');

      // Tell Metal that this computed property depends on firstName
      // and lastName
    }).property('firstName', 'lastName')
  });
  ```

  @method property
  @param {String} path* zero or more property paths
  @return {Metal.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.property = function() {
  var args = [];
  for (var i = 0, l = arguments.length; i < l; i++) {
    args.push(arguments[i]);
  }
  this._dependentKeys = args;
  return this;
};

/**
  In some cases, you may want to annotate computed properties with additional
  metadata about how they function or what values they operate on. For example,
  computed property functions may close over variables that are then no longer
  available for introspection.

  You can pass a hash of these values to a computed property like this:

  ```
  person: function() {
    var personId = this.get('personId');
    return App.Person.create({ id: personId });
  }.property().meta({ type: App.Person })
  ```

  The hash that you pass to the `meta()` function will be saved on the
  computed property descriptor under the `_meta` key. Metal runtime
  exposes a public API for retrieving these values from classes,
  via the `metaForProperty()` function.

  @method meta
  @param {Hash} meta
  @chainable
*/

ComputedPropertyPrototype.meta = function(meta) {
  if (arguments.length === 0) {
    return this._meta || {};
  } else {
    this._meta = meta;
    return this;
  }
};

/* impl descriptor API */
ComputedPropertyPrototype.willWatch = function(obj, keyName) {
  // watch already creates meta for this instance
  var meta = obj[META_KEY];
  Metal.assert('watch should have setup meta to be writable', meta.source === obj);
  if (!(keyName in meta.cache)) {
    addDependentKeys(this, obj, keyName, meta);
  }
};

ComputedPropertyPrototype.didUnwatch = function(obj, keyName) {
  var meta = obj[META_KEY];
  Metal.assert('unwatch should have setup meta to be writable', meta.source === obj);
  if (!(keyName in meta.cache)) {
    // unwatch already creates meta for this instance
    removeDependentKeys(this, obj, keyName, meta);
  }
};

/* impl descriptor API */
ComputedPropertyPrototype.didChange = function(obj, keyName) {
  // _suspended is set via a CP.set to ensure we don't clear
  // the cached value set by the setter
  if (this._cacheable && this._suspended !== obj) {
    var meta = metaFor(obj);
    if (keyName in meta.cache) {
      delete meta.cache[keyName];
      if (!meta.watching[keyName]) {
        removeDependentKeys(this, obj, keyName, meta);
      }
    }
  }
};

/* impl descriptor API */
ComputedPropertyPrototype.get = function(obj, keyName) {
  var ret, cache, meta;
  if (this._cacheable) {
    meta = metaFor(obj);
    cache = meta.cache;
    if (keyName in cache) { return cache[keyName]; }
    ret = cache[keyName] = this.func.call(obj, keyName);
    if (!meta.watching[keyName]) {
      addDependentKeys(this, obj, keyName, meta);
    }
  } else {
    ret = this.func.call(obj, keyName);
  }
  return ret;
};

/* impl descriptor API */
ComputedPropertyPrototype.set = function(obj, keyName, value) {
  var cacheable = this._cacheable,
      func = this.func,
      meta = metaFor(obj, cacheable),
      watched = meta.watching[keyName],
      oldSuspended = this._suspended,
      hadCachedValue = false,
      cache = meta.cache,
      cachedValue, ret;

  if (this._readOnly) {
    throw new Error('Cannot Set: ' + keyName + ' on: ' + obj.toString() );
  }

  this._suspended = obj;

  try {

    if (cacheable && cache.hasOwnProperty(keyName)) {
      cachedValue = cache[keyName];
      hadCachedValue = true;
    }

    // Check if the CP has been wrapped
    if (func.wrappedFunction) { func = func.wrappedFunction; }

    // For backwards-compatibility with computed properties
    // that check for arguments.length === 2 to determine if
    // they are being get or set, only pass the old cached
    // value if the computed property opts into a third
    // argument.
    if (func.length === 3) {
      ret = func.call(obj, keyName, value, cachedValue);
    } else if (func.length === 2) {
      ret = func.call(obj, keyName, value);
    } else {
      Metal.defineProperty(obj, keyName, null, cachedValue);
      Metal.set(obj, keyName, value);
      return;
    }

    if (hadCachedValue && cachedValue === ret) { return; }

    if (watched) { Metal.propertyWillChange(obj, keyName); }

    if (hadCachedValue) {
      delete cache[keyName];
    }

    if (cacheable) {
      if (!watched && !hadCachedValue) {
        addDependentKeys(this, obj, keyName, meta);
      }
      cache[keyName] = ret;
    }

    if (watched) { Metal.propertyDidChange(obj, keyName); }
  } finally {
    this._suspended = oldSuspended;
  }
  return ret;
};

/* called when property is defined */
ComputedPropertyPrototype.setup = function(obj, keyName) {
  var meta = obj[META_KEY];
  if (meta && meta.watching[keyName]) {
    addDependentKeys(this, obj, keyName, metaFor(obj));
  }
};

/* called before property is overridden */
ComputedPropertyPrototype.teardown = function(obj, keyName) {
  var meta = metaFor(obj);

  if (meta.watching[keyName] || keyName in meta.cache) {
    removeDependentKeys(this, obj, keyName, meta);
  }

  if (this._cacheable) { delete meta.cache[keyName]; }

  return null; // no value to restore
};

Metal.Mixin = Mixin;
Metal.Alias = Alias;

module.exports = Metal;
