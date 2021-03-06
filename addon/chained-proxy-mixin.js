/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember"; // Ember.assert

const {get, set, isBlank} = Ember;
const {addObserver, removeObserver} = Ember;
const {propertyDidChange} = Ember;
const {computed, defineProperty, Mixin} = Ember;


function contentPropertyDidChange(content, contentKey) {
  var key = contentKey.replace(/contents\.[a-zA-Z0-9@_]+\./, '');
  if (key in this) { return; } // if shadowed in proxy
  propertyDidChange(this, key);
}


export default Mixin.create({
  /**
     An array of objects which you want to scan for properties. The chained
     proxy will use the first object it finds with a value thats not undefined.
     Make sure that you set `contents` to an Ember.A() so that bindings will
     work when you push or unshift objects onto `contents`.

     @property contents
     @type Ember.A
     @default null
  */
  contents: null,
  //_contentDidChange: Ember.observer('contents', function() {
  //  Ember.assert("Can't set Proxy's contents to itself", get(this, 'contents') !== this);
  //}),

  isTruthy: computed.bool('contents'),

  _debugContainerKey: null,

  willWatchProperty: function (key) {
    // Always watch the array of contents for additions.
    var contentKey = 'contents.@each.' + key;
    addObserver(this, contentKey, null, contentPropertyDidChange);

  },

  didUnwatchProperty: function (key) {
    var contentKey = 'contents.@each.' + key;
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },

  unknownProperty: function (key) {
    var content = this.firstContentWithProperty(key);
    if (content) {
      return get(content, key);
    }
  },

  setUnknownProperty: function (key, value) {
    // var m = meta(this);
    // if (m.proto === this) {
    //   // if marked as prototype then just defineProperty
    //   // rather than delegate
    //   defineProperty(this, key, null, value);
    //   return value;
    // }

    var content = this.firstContentWithProperty(key);
    if (isBlank(content)){
      // set on this object if can't find it on contents.
      defineProperty(this, key, null, value);
      return set(this, key, value);
    } else {
      return set(content, key, value);
    }

  },

  // Search through array of contents for one that has that property.
  // Returns null or undefined if can't find a contents with that property
  firstContentWithProperty: function (property) {
    var contents = get(this, 'contents');
    if(isBlank(contents)){return null;}// if no contents, just use this.

    var index = this.indexOfFirstContentWithProperty(property);
    return contents[index];
  },

  indexOfFirstContentWithProperty: function (property) {
    var contents = get(this, 'contents');
    if(isBlank(contents)){return null;}
    for(var i = 0; i < contents.length; i++){
      if (get(contents[i], property) !== undefined) {
        return i;
      }
    }
    return null;
  },

});
