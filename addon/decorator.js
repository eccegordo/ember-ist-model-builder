import Ember from 'ember';
import DS from 'ember-data';

/*
The IST Model Builder Decorator is an extension to DS.Model
that works like an Ember.ObjectProxy. Use it when you have some API
data that is read-only but you need the user to apply their 
own settings and properties to it.

- The `proxyTo` property is read only. Any set properties will be set on the
  model and not to the proxy.

- The `proxyTo` object is cached inside the model. It will try to find a new
  version of `proxyTo` in the store when the model is loaded. If it 404s then
  it will used the cached version to build a new unsaved model of type `proxyKind`.
  This ensures that any computed properties will be available.
  
*/
export default function(newModel) {
  if (!Ember.isBlank(newModel.attributes) ){
    console.error('Arguments for IstModelDecorator is a model config and not an object for DS.Model. IstModelDecorator is not a mixin.');
    return;
  }
  
  var modelConfig = newModel.modelConfig;
  newModel.proxyCache = DS.attr('raw');
  newModel.proxyKind  = DS.attr('string');
  newModel.proxyId    = DS.attr('string');
  
  // Add a place for us to store modified proxy properties locally.
  newModel.proxyLocalProperties = DS.attr('raw', {defaultValue: {} });
  
  return DS.Model.extend(newModel).extend(Ember._ProxyMixin).extend({
    fetchFromStore: true,
    proxyTo:        null,// use myModel.set('proxyTo', otherModel);
    
    // Computed property to give to the ProxyObject
    content: Ember.computed('proxyId', 'proxyKind', function () {
      var self = this;
      if (self.get('fetchFromStore') && self.get('proxyId') ) {
        return DS.PromiseObject.create({
          promise: new Ember.RSVP.Promise(function(resolve){
            var finder = self.store.find(self.get('proxyKind'), self.get('proxyId'));
            finder.then(
              function (found) {
                self.set('proxyTo', found);// Update the cache to latest version
                self.set('content', found);
                resolve(found);
                self.incrementProperty('childAssociationChangeCounter');
              },
              function () {
                // return the cached version
                // NOTE: This object does not have an ID on it. It will be null
                console.warn("Falling back to cached proxy: ", self.get('proxyKind'), self.get('proxyId') );
                var cachedModel = self.store.createRecord(self.get('proxyKind'), self.get('proxyCache'));
                resolve(cachedModel);
                self.incrementProperty('childAssociationChangeCounter');
              }
            );// end finder.then
          })// end rsvp
        });// end promise object
        
      } else {
        return this.get('proxyTo');
      }
    }),
    
    updateProxyId: Ember.observer('proxyTo', 'proxyTo.isLoaded', function () {
      var proxy = this.get('proxyTo');
      this.set('fetchFromStore', false);
      this.set('proxyId', proxy.get('id') );
      
      if(proxy.content && proxy.get("isLoaded") === true) {
        // it's a promise object
        this.set('proxyKind',  proxy.content.constructor.typeKey.dasherize() );
        this.set('proxyTo',    proxy.content);
        this.set('proxyCache', proxy.content);
        
      } else if (proxy.constructor.typeKey) {
        // It's a model
        this.set('proxyKind',  proxy.constructor.typeKey.dasherize() );
        this.set('proxyTo',    proxy);
        this.set('proxyCache', proxy);
        
      }else{
        // it's a promise
      }
    }),

    // Any unknown property changes will be stored
    // in `proxyLocalProperties` so that the proxyTo
    // object remains unchanged.
    setUnknownProperty: function (key, value) {
      // Set the asignment key to our special store
      var localKey = 'proxyLocalProperties.' + key;
      return this._super(localKey, value);
    },

    // Pull properties out of `proxyLocalProperties`
    // if it is in there.
    unknownProperty: function (key) {
      // Check our special store first
      var localKey = 'proxyLocalProperties.' + key;
      var value = this.get(localKey);
      if (value !== undefined){
        return value;
      } else {
        // have it ask the proxy object for a value.
        return this._super.apply(this, arguments);
      }
    }
    
  });// end extend for decoratorModel
  
} // end export
