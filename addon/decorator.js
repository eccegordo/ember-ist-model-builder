import Ember from 'ember';
import DS from 'ember-data';


export default function(newModel) {
  var modelConfig = newModel.modelConfig;
  
  newModel.proxyCache = DS.attr('raw');
  newModel.proxyKind  = DS.attr('string');
  newModel.proxyId    = DS.attr('string');

  // Set the inExport properties to the model and not the proxy.
  if (modelConfig.addExportProperties === true || modelConfig.addExportProperties === undefined) {
     // Add a place for us to store proxy properties locally.
     newModel.proxyLocalProperties = DS.attr('raw', {defaultValue: {} });
   }
   
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
    
    // Set the inExport properties to the model and not the proxy.
    // Add a place for us to store proxy properties locally.
    setUnknownProperty: function (key, value) {
      if (key.match(/InExport$/)  && this.get('proxyLocalProperties')  !== undefined) {
        // Set the asignment key to our special store
        key = 'proxyLocalProperties.' + key;
        this.set(key, value);
      }
      
      // Also set it on the object itself
      return this._super.apply(this, arguments);
    },
    
    unknownProperty: function (key) {
      if (key.match(/InExport$/) && this.get('proxyLocalProperties')  !== undefined) {
        // Check our special store first
        key = 'proxyLocalProperties.' + key;
        
        var value = this.get(key);
        if (value !== undefined){
          return value;
        }
      }
      // Else return whatever super wants.
      return this._super.apply(this, arguments);
    }

  });// end extend for decoratorModel
  
} // end export
