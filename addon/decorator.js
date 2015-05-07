import Ember from 'ember';
import DS    from 'ember-data';


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
  
  return DS.Model.extend(newModel).extend({
    fetchFromStore: true,
    proxyTo:        null,// use myModel.set('proxyTo', otherModel);
    
    content: Ember.computed('proxyId', 'proxyKind', 'isLoading', function (key, value) {
      var self = this;
      
      if (value !== undefined){return value;}// allow setting content when fetch is resolved.
      if (self.get('isLoading') === true){return null;}//skip if not loaded yet.
      
      if (self.get('fetchFromStore') && self.get('proxyId') ) {
        return DS.PromiseObject.create({
          promise: new Ember.RSVP.Promise(function(resolve){
            var finder = self.store.find(self.get('proxyKind'), self.get('proxyId'));
            finder.then(
              function (found) {
                self.set('proxyTo', found);// Update the cache to latest version
                Ember.set(self, 'content', found);
                resolve(found);
                self.incrementProperty('childAssociationDidChange');
              },
              function () {
                // return the cached version
                // NOTE: This object does not have an ID on it. It will be null
                console.warn("Falling back to cached proxy: ", self.get('proxyKind'), self.get('proxyId') );
                var cachedModel = self.store.createRecord(self.get('proxyKind'), self.get('proxyCache'));
                resolve(cachedModel);
                self.incrementProperty('childAssociationDidChange');
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
      
      if (Ember.isBlank(proxy) ) {
        this.set('proxyId',    null);
        this.set('proxyKind',  null);
        this.set('proxyCache', null);
        return;
      }
      
      this.set('fetchFromStore', false);
      this.set('proxyId', proxy.get('id') );
      
      if(proxy.content && proxy.get("isLoaded") === true) {
        // it's a promise object
        this.set('proxyKind',  Ember.String.dasherize(proxy.content.constructor.typeKey) );
        this.set('proxyTo',    proxy.content);
        this.set('proxyCache', proxy.content);
        
      } else if (proxy.constructor.typeKey) {
        // It's a model
        this.set('proxyKind',  Ember.String.dasherize(proxy.constructor.typeKey) );
        this.set('proxyTo',    proxy);
        this.set('proxyCache', proxy);
        
      }else{
        // it's a promise
      }
    }),
    
    // Add a new computed property that will fetch fetch from `proxyLocalProperties`
    // if the key has been set, or, if setting the property, set it to `proxyLocalProperties`
    // instead of the proxyTo object. Default value will come from the proxyTo object.
    unknownProperty: function (key) {
      // Check our special store first
      var localKey   = 'proxyLocalProperties.' + key;
      var proxyKey   = 'content.' + key;
      var localValue = this.get(localKey);
      var proxyValue = this.get(proxyKey);

      var fnCode = "if(value !== undefined){this.set('"+localKey+"', value); return value;}"+
          "var v = this.get('"+localKey+"'); "+
          "if (v !== undefined){return v;}" +
          "else{return this.get('"+proxyKey+"'); }";
      
      this.propertyWillChange(key);
      Ember.defineProperty(this,
                           key,
                           Ember.computed('proxyTo',
                                          'content',
                                          new Function('key', 'value', fnCode)
                                         )
                          );

      return this.get(key);
      this.propertyDidChange(key);
    }
    
    
  });// end extend for decoratorModel
  
} // end export
