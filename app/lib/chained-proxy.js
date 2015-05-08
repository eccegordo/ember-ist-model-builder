/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember"; // Ember.assert

var get                 = Ember.get;
var set                 = Ember.set;
var addObserver         = Ember.addObserver;
var removeObserver      = Ember.removeObserver;
var addBeforeObserver   = Ember.addBeforeObserver;
var removeBeforeObserve = Ember.removeBeforeObserve;


var propertyWillChange  = Ember.propertyWillChange;
var propertyDidChange   = Ember.propertyDidChange;
var computed            = Ember.computed;
var defineProperty      = Ember.defineProperty;
var Mixin               = Ember.Mixin;
var observer            = Ember.Observer;


function contentPropertyWillChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; }  // if shadowed in proxy
  propertyWillChange(this, key);
}

function contentPropertyDidChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; } // if shadowed in proxy
  propertyDidChange(this, key);
}

/**
  `Ember.ProxyMixin` forwards all properties not defined by the proxy itself
  to a proxied `content` object.  See Ember.ObjectProxy for more details.

  @class ProxyMixin
  @namespace Ember
*/
export default Mixin.create({
    /**
    The object whose properties will be forwarded.

    @property content
    @type Ember.Object
    @default null
    */
  contents: null,
  //_contentDidChange: observer('contents', function() {
  //  Ember.assert("Can't set Proxy's contents to itself", get(this, 'contents') !== this);
  //}),
  
  isTruthy: computed.bool('contents'),
  
  _debugContainerKey: null,
  
  willWatchProperty: function (key) {
    var index = this.indexOfFirstContentWithProperty(key);
    
    if (index !== null) {
      var contentKey = 'contents.' + index + '.' + key;
    }else{
      var contentKey = key;
    }
    
    addBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },
  
  didUnwatchProperty: function (key) {
    var index = this.indexOfFirstContentWithProperty(key);
    if (index !== null) {
      var contentKey = 'contents.' + index + '.' + key;
    }else{
      var contentKey = key;
    }
    
    removeBeforeObserver(this, contentKey, null, contentPropertyWillChange);
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
    return set(content, key, value);
  },
  
  firstContentWithProperty: function (property) {
    var contents = get(this, 'contents');
    var index = this.indexOfFirstContentWithProperty(property);
    var found = contents[index];
    if (found === undefined){
      found = this;
    }
    return found;
  },
  
  indexOfFirstContentWithProperty: function (property) {
    var contents = get(this, 'contents');
    if(Ember.isBlank(contents)){return null;}
    for(var i = 0; i < contents.length; i++){
      if (get(contents[i], property) !== undefined) {
        return i;
      }
    }
    return null;
  },
  
});

