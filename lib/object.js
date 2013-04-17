
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty
// var o = {};
// Object.defineProperty(o, "a", { get : function(){return 1;},
//                                 configurable : true } );
//  
// Object.defineProperty(o, "a", {enumerable : true}); // throws a TypeError
// Object.defineProperty(o, "a", {set : function(){}}); // throws a TypeError (set was undefined previously)
// Object.defineProperty(o, "a", {get : function(){return 1;}}); // throws a TypeError (even though the new get does exactly the same thing)
// Object.defineProperty(o, "a", {value : 12}); // throws a TypeError

// Class.create = Object.create;
//var defineProperty = Object.defineProperty;

var _ = require('underscore')
, metal = require('./metal')
, reopen = metal.Mixin.prototype.reopen
, rewatch = metal.rewatch
, UUID_KEY = metal.UUID_KEY
, undefinedDescriptor = metal.undefinedDescriptor
, defineProperty = metal.defineProperty
, meta = metal.meta
, finishPartial = metal.Mixin.finishPartial
, finishChains = metal.Mixin.finishChains
, IS_BINDING = metal.IS_BINDING
, MANDATORY_SETTER = true;

function fieldOfView() {

  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster. This is glue code so we want it to be as fast as
  // possible.

  var wasApplied = false, initMixins, initProperties;

  var Class = function() {
      
    if (!wasApplied) {
      Class.proto(); // prepare prototype...
    }
    defineProperty(this, UUID_KEY, undefinedDescriptor);
    defineProperty(this, '_super', undefinedDescriptor);

    var m = meta(this);
    m.proto = this;
    if (initMixins) {
      // capture locally so we can clear the closed over variable
      var mixins = initMixins;
      initMixins = null;
      //console.log(mixins);
      this.reopen.apply(this, mixins);
    }
    //console.log(m);
    
    if (initProperties) {
      // capture locally so we can clear the closed over variable
      var props = initProperties;
      initProperties = null;

      var concatenatedProperties = this.concatenatedProperties;

      for (var i = 0, l = props.length; i < l; i++) {
        var properties = props[i];
        for (var keyName in properties) {
          if (!properties.hasOwnProperty(keyName)) { continue; }

          var value = properties[keyName];

          if (IS_BINDING.test(keyName)) {
            var bindings = m.bindings;
            if (!bindings) {
              bindings = m.bindings = {};
            } else if (!m.hasOwnProperty('bindings')) {
              bindings = m.bindings = o_create(m.bindings);
            }
            bindings[keyName] = value;
          }

          var desc = m.descriptors[keyName];

          if((typeof value === 'function' && value.toString().indexOf('._super') !== -1)) { 
              console.log("metal.create does not support defining methods that call _super.");
          }

          if (concatenatedProperties && indexOf(concatenatedProperties, keyName) >= 0) {
            var baseValue = this[keyName];

            if (baseValue) {
              if ('function' === typeof baseValue.concat) {
                value = baseValue.concat(value);
              } else {
                value = metal.makeArray(baseValue).concat(value);
              }
            } else {
              value = metal.makeArray(value);
            }
          }

          if (desc) {
            desc.set(this, keyName, value);
          } else {
            if (typeof this.setUnknownProperty === 'function' && !(keyName in this)) {
              this.setUnknownProperty(keyName, value);
            } else if (MANDATORY_SETTER) {
              metal.defineProperty(this, keyName, null, value); // setup mandatory setter
            } else {
              this[keyName] = value;
            }
          }
        }
      }
    }
    finishPartial(this, m);
    delete m.proto;
    finishChains(this);
    
    this.init.apply(this, arguments);
  };
  
  Class.prototype.test = function() {
      return true;
  }
  
  Class.toString = Mixin.prototype.toString;
  Class.willReopen = function() {
    if (wasApplied) {
      Class.PrototypeMixin = Mixin.create(Class.PrototypeMixin);
    }

    wasApplied = false;
  };
  Class._initMixins = function(args) { initMixins = args; };
  Class._initProperties = function(args) { initProperties = args; };

  Class.proto = function() {
    var superclass = Class.superclass;
    if (superclass) { superclass.proto(); }

    if (!wasApplied) {
      wasApplied = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
      rewatch(Class.prototype);
    }

    return this.prototype;
  };

  return Class;

}

//var MetalObject = fieldOfView();
var MetalObject = fieldOfView();

MetalObject.toString = function() { return "Hoser.MetalObject"; };

MetalObject.PrototypeMixin = metal.Mixin.create({
  reopen: function() {
    applyMixin(this, arguments, true);
    return this;
  }
  
  , get: function(keyName) {
      //return 'Foo of the Bar';
      return metal.get(this, keyName);
  }
  
  , set: function(keyName, value) {
      metal.set(this, keyName, value);
      return this;
  }
  
  , isInstance: true,

  /**
    An overridable method called when objects are instantiated. By default,
    does nothing unless it is overridden during class definition.

    Example:

    ```javascript
    App.Person = Ember.Object.extend({
      init: function() {
        this._super();
        alert('Name is ' + this.get('name'));
      }
    });

    var steve = App.Person.create({
      name: "Steve"
    });

    // alerts 'Name is Steve'.
    ```

    NOTE: If you do override `init` for a framework class like `Ember.View` or
    `Ember.ArrayController`, be sure to call `this._super()` in your
    `init` declaration! If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    ```

    @method init
  */
  init: function() {},

  /**
    Defines the properties that will be concatenated from the superclass
    (instead of overridden).

    By default, when you extend an Ember class a property defined in
    the subclass overrides a property with the same name that is defined
    in the superclass. However, there are some cases where it is preferable
    to build up a property's value by combining the superclass' property
    value with the subclass' value. An example of this in use within Ember
    is the `classNames` property of `Ember.View`.

    Here is some sample code showing the difference between a concatenated
    property and a normal one:

    ```javascript
    App.BarView = Ember.View.extend({
      someNonConcatenatedProperty: ['bar'],
      classNames: ['bar']
    });

    App.FooBarView = App.BarView.extend({
      someNonConcatenatedProperty: ['foo'],
      classNames: ['foo'],
    });

    var fooBarView = App.FooBarView.create();
    fooBarView.get('someNonConcatenatedProperty'); // ['foo']
    fooBarView.get('classNames'); // ['ember-view', 'bar', 'foo']
    ```

    This behavior extends to object creation as well. Continuing the
    above example:

    ```javascript
    var view = App.FooBarView.create({
      someNonConcatenatedProperty: ['baz'],
      classNames: ['baz']
    })
    view.get('someNonConcatenatedProperty'); // ['baz']
    view.get('classNames'); // ['ember-view', 'bar', 'foo', 'baz']
    ```
    Adding a single property that is not an array will just add it in the array:

    ```javascript
    var view = App.FooBarView.create({
      classNames: 'baz'
    })
    view.get('classNames'); // ['ember-view', 'bar', 'foo', 'baz']
    ```

    Using the `concatenatedProperties` property, we can tell to Ember that mix
    the content of the properties.

    In `Ember.View` the `classNameBindings` and `attributeBindings` properties
    are also concatenated, in addition to `classNames`.

    This feature is available for you to use throughout the Ember object model,
    although typical app developers are likely to use it infrequently.

    @property concatenatedProperties
    @type Array
    @default null
  */
  concatenatedProperties: null,

  /**
    Destroyed object property flag.

    if this property is `true` the observers and bindings were already
    removed by the effect of calling the `destroy()` method.

    @property isDestroyed
    @default false
  */
  isDestroyed: false,

  /**
    Destruction scheduled flag. The `destroy()` method has been called.

    The object stays intact until the end of the run loop at which point
    the `isDestroyed` flag is set.

    @property isDestroying
    @default false
  */
  isDestroying: false,

  /**
    Destroys an object by setting the `isDestroyed` flag and removing its
    metadata, which effectively destroys observers and bindings.

    If you try to set a property on a destroyed object, an exception will be
    raised.

    Note that destruction is scheduled for the end of the run loop and does not
    happen immediately.

    @method destroy
    @return {Ember.Object} receiver
  */
  destroy: function() {
    if (this._didCallDestroy) { return; }

    this.isDestroying = true;
    this._didCallDestroy = true;

    if (this.willDestroy) { this.willDestroy(); }

    schedule('destroy', this, this._scheduledDestroy);
    return this;
  },

  /**
    @private

    Invoked by the run loop to actually destroy the object. This is
    scheduled for execution by the `destroy` method.

    @method _scheduledDestroy
  */
  _scheduledDestroy: function() {
    destroy(this);
    set(this, 'isDestroyed', true);

    if (this.didDestroy) { this.didDestroy(); }
  },

  bind: function(to, from) {
    if (!(from instanceof Ember.Binding)) { from = Ember.Binding.from(from); }
    from.to(to).connect(this);
    return from;
  },

  /**
    Returns a string representation which attempts to provide more information
    than Javascript's `toString` typically does, in a generic way for all Ember
    objects.

        App.Person = Em.Object.extend()
        person = App.Person.create()
        person.toString() //=> "<App.Person:ember1024>"

    If the object's class is not defined on an Ember namespace, it will
    indicate it is a subclass of the registered superclass:

        Student = App.Person.extend()
        student = Student.create()
        student.toString() //=> "<(subclass of App.Person):ember1025>"

    If the method `toStringExtension` is defined, its return value will be
    included in the output.

        App.Teacher = App.Person.extend({
          toStringExtension: function(){
            return this.get('fullName');
          }
        });
        teacher = App.Teacher.create()
        teacher.toString(); //=> "<App.Teacher:ember1026:Tom Dale>"

    @method toString
    @return {String} string representation
  */
  // toString: function toString() {
  //   var hasToStringExtension = typeof this.toStringExtension === 'function',
  //       extension = hasToStringExtension ? ":" + this.toStringExtension() : '';
  //   var ret = '<'+this.constructor.toString()+':'+guidFor(this)+extension+'>';
  //   this.toString = makeToString(ret);
  //   return ret;
  // }
});

/*
    Wrap the 
*/
MetalObject.PrototypeMixin.ownerConstructor = MetalObject;

MetalObject.__super__ = null;

var ClassMixin = metal.Mixin.create({

    ClassMixin: metal.required(),

    PrototypeMixin: metal.required()

    , isClass: true,

    isMethod: false,

    extend: function() {
        
        var Class = fieldOfView(), proto;

        Class.ClassMixin = metal.Mixin.create(this.ClassMixin);
        Class.AccessorMixin = metal.Mixin.create(this.AccessorMixin);
        Class.PrototypeMixin = metal.Mixin.create(this.PrototypeMixin);
    
        Class.ClassMixin.ownerConstructor = Class;
        Class.PrototypeMixin.ownerConstructor = Class;
    
        reopen.apply(Class.PrototypeMixin, arguments);
    
        Class.superclass = this;
        Class.__super__  = this.prototype;
    
        proto = Class.prototype = Object.create(this.prototype);
        proto.constructor = Class;
        metal.generateUUID(proto, 'hoser');
        metal.meta(proto).proto = proto; // this will disable observers on prototype
    
        Class.AccessorMixin.apply(Class);
        Class.ClassMixin.apply(Class);
        return Class;
    },
    
    createWithMixins: function() {
        var C = this;
        if (arguments.length>0) { this._initMixins(arguments); }
        return new C();
    },
    
    create: function() {
        var C = this;
        if (arguments.length>0) { this._initProperties(arguments); }
        return new C();
    },
    
    reopen: function() {
      this.willReopen();
      reopen.apply(this.PrototypeMixin, arguments);
      return this;
    },

    reopenClass: function() {
      reopen.apply(this.ClassMixin, arguments);
      applyMixin(this, arguments, false);
      return this;
    },

    detect: function(obj) {
      if ('function' !== typeof obj) { return false; }
      while(obj) {
        if (obj===this) { return true; }
        obj = obj.superclass;
      }
      return false;
    },

    detectInstance: function(obj) {
      return obj instanceof this;
    },

    /**
      In some cases, you may want to annotate computed properties with additional
      metadata about how they function or what values they operate on. For
      example, computed property functions may close over variables that are then
      no longer available for introspection.

      You can pass a hash of these values to a computed property like this:

      ```javascript
      person: function() {
        var personId = this.get('personId');
        return App.Person.create({ id: personId });
      }.property().meta({ type: App.Person })
      ```

      Once you've done this, you can retrieve the values saved to the computed
      property from your class like this:

      ```javascript
      MyClass.metaForProperty('person');
      ```

      This will return the original hash that was passed to `meta()`.

      @method metaForProperty
      @param key {String} property name
    */
    metaForProperty: function(key) {
      var desc = meta(this.proto(), false).descs[key];

      //console.log("metaForProperty() could not find a computed property with key '"+key+"'.", !!desc && desc instanceof Ember.ComputedProperty);
      return desc._meta || {};
    },

    /**
      Iterate over each computed property for the class, passing its name
      and any associated metadata (see `metaForProperty`) to the callback.

      @method eachComputedProperty
      @param {Function} callback
      @param {Object} binding
    */
    eachComputedProperty: function(callback, binding) {
      var proto = this.proto(),
          descs = meta(proto).descs,
          empty = {},
          property;

      for (var name in descs) {
        property = descs[name];

        if (property instanceof metal.Metal.ComputedProperty) {
          callback.call(binding || this, name, property._meta || empty);
        }
      }
    }

});


ClassMixin.ownerConstructor = MetalObject;

MetalObject.ClassMixin = ClassMixin;

ClassMixin.apply(MetalObject);

module.exports = MetalObject;
