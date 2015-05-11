import Ember from 'ember';
import DS    from 'ember-data';

// Give it an array and an action function that returns
// a promise. It will call the action function for each item
// in the provided array and will wait for the returned
// promise to be resolved before going to the next item
// in the array. The function itself returns a promise
// so that you know when the whole array has been processed.
export function forEachWait(array, actionFunction, index) {
  var rsvpName = '';
  if (array.get === undefined){array = Ember.A(array);}// convert to ember array if not one already
  if (array.length && array.length > 0){
    rsvpName = 'forEachPromise ' + array.get('firstObject').constructor + ' size: '  + array.length;
  }else{
    rsvpName = 'forEachPromise Zero length: ' + array;
  }
  
  return new Ember.RSVP.Promise(function(arrayResolve){
    // Set up the array index for recursion counting
    if (index === undefined){
      index = 0;
    }else{
      index += 1;
    }
    
    // If each item has been processed or the array was empty, resolve
    if (array.length === 0 || array.length === index){
      arrayResolve();
      return;
    }
    
    var item = array.objectAt(index);
    if(item === undefined){
      arrayResolve();
      return;// Catch the edge case where item is undefined.
    }

    // Call action function and then..
    actionFunction(item).then(function () {
      // A little recursion here...
      // Process the next item in the array.
      forEachWait(array, actionFunction, index).then(function () {
        // Let the caller know the array is completed.
        arrayResolve();
      });
    });// end action function then
  }, rsvpName);// end rsvp
  
}



// export function deepSaveArray(items) {
//   var finalSaveRsvp = new Ember.RSVP.Promise(function(finalSaveResolve) {
//     var saveRsvps = [];
//     items.forEach(function(dataSource){
//       saveRsvps.push( dataSource.deepSave() );
//     });// foreach new source
    
//     Ember.RSVP.all(saveRsvps).then(function () {
//       finalSaveResolve(items);
//     });
//   });// end allSaveRsvp
  
//   return finalSaveRsvp;
// }

// export function deepSaveArray(items) {
//   var finalSaveRsvp = new Ember.RSVP.Promise(function(finalSaveResolve) {
//     var saveRsvps = [];
//     items.forEach(function(dataSource){
//       saveRsvps.push( dataSource.deepSave() );
//     });// foreach new source
    
//     Ember.RSVP.all(saveRsvps).then(function () {
//       finalSaveResolve(items);
//     });
//   });// end allSaveRsvp
  
//   return finalSaveRsvp;
// }


export var AssociationDescriptor = Ember.Object.extend({
  attrName:      null,// attr name on parent
  object:        null,// the child
  parent:        null,// the parent
  collection:    null,// collection child is from
  level:         0,
  
  // Get title from the config where the relationship was defined.
  title: Ember.computed('parent', 'attrName', function () {
    var attrName = this.get('attrName');
    var parent = this.get('parent');
    if (parent === null){return '';}
    return parent.get(attrName + 'Title');
  }),
  
  // Get display groups from the config where the relationship was defined.
  displayGroups: Ember.computed('parent', 'attrName', function () {
    var attrName = this.get('attrName');
    var parent = this.get('parent');
    if (parent === null){return [];}
    return parent.get(attrName + 'DisplayGroups');
  }),
  
  // This adds support for `inDefaultDisplayGroup` and `inFooDisplayGroup`
  unknownProperty: function (key) {
    var matches = key.match(/in([a-zA-Z0-9]+)DisplayGroup/);
    if (matches){
      var displayGroup = matches[1].substr(0, 1).toLowerCase() + matches[1].substr(1);
      return this.inDisplayGroup(displayGroup);
    }else {
      return this._super(arguments);
    }
  },
  
  // Always report being in a display group for level zero
  // since there is no way for a display group to be defined
  // for a level zero association.
  inDisplayGroup: function(displayGroup){
    var level = this.get('level');
    if(level === 0 || this.get('displayGroups').indexOf(displayGroup) > -1){
      return true;
    }
    return false;
  },
  
});


// These are helpers for looping over child objects
export default function IstModelChildrenHelpers(modelConfig) {
  var newModel = {};

  newModel.helpers = {
    forEachWait: forEachWait,
    
    processChildNames: function (model, callback, childNames, level) {
      var helpers = this;// this referes to 'helpers'
      
      return new Ember.RSVP.Promise(function(processChildNamesResolve) {
        var loopRsvp = forEachWait(childNames, function (childName) {
          return new Ember.RSVP.Promise(function(innerChildNameResolve) {
            
            var childRsvp = model.get(childName);
            childRsvp.then(function (foundChildren) {
              var childMeta = AssociationDescriptor.create({
                attrName:      childName,
                object:        null,// Will set later
                collection:    foundChildren,
                level:         level,
                parent:        model,
              });
              
              helpers.processFoundChildren(foundChildren, callback, childMeta).then(function () {
                innerChildNameResolve();
              });
            });
            
          }, 'processChildNames inner' + childName);
        });
        
        loopRsvp.then(function () {
          processChildNamesResolve();
        });
        
      }, 'processChildNames ' + model + ' ' + childNames);// end processChildNames RSVP
      
    },// end processChildNames
    
    processFoundChildren: function (foundChildren, callback, childMeta) {
      var self = this;
      var rsvpName = '';
      
      if (foundChildren && foundChildren.length && foundChildren.length > 0){
        rsvpName = 'processFoundChildren ' + foundChildren.get('firstObject').constructor + ' size: '  + foundChildren.length;
      }else if(foundChildren === null){
        rsvpName = 'processFoundChildren NULL';
      }else{
        rsvpName = 'processFoundChildren ' + foundChildren.constructor;
      }
      
      return new Ember.RSVP.Promise(function(processFoundChildrenResolve) {
        if (foundChildren === null){
          // I guess the child has no value.
          processFoundChildrenResolve();
          return;
        }else if(Ember.isBlank(foundChildren.get('length')) ){
          // Child was a hasOne.
          var child = foundChildren;
          childMeta.set('object', child);
          self.processChild(child, callback, childMeta).then(function () {
            processFoundChildrenResolve();
          });
        } else {
          // Child is a hasMany
          var loopRsvp = forEachWait(foundChildren, function (child) {
            
            // Creat a new object for this child in the has many.
            var thisChildMeta = AssociationDescriptor.create({
              object:        child,
              attrName:      childMeta.get('attrName'),
              collection:    childMeta.get('collection'),
              level:         childMeta.get('level'),
              parent:        childMeta.get('parent'),
            });
            
            // return that promise so the loop can wait for it to be done.
            return self.processChild(child, callback, thisChildMeta);
          });
          
          loopRsvp.then(function () {
            processFoundChildrenResolve();
          });
        }
      }, 'processFoundChildren ' + foundChildren);// end processFoundChildren.rsvp
      
    },//end processFoundChildren
    
    
    processChild: function (child, callback, childMeta) {
      return new Ember.RSVP.Promise(function(processChildResolve) {
        if(child.everyChildAssociation === undefined){
          processChildResolve();// not a model builder object. Can't go any deeper
          return;
        }
        
        // If it's a proxy to, wait for proxy to be loaded as well.
        if(child.get('proxyId') !== undefined && child.get('proxyId') !== null && child.get('content').then){
          child.get('content').then(function(){
            child.everyChildAssociation(callback, childMeta).then(function () {
              processChildResolve();
              return;
            });// end everyChildAssociation.then
              
          });
        }else {
          
          child.everyChildAssociation(callback, childMeta).then(function () {
            processChildResolve();
            return;
          });// end everyChildAssociation.then
          
        }
        
        
      }, 'processChild '+ child.constructor + ' ' + child );// processChild rsvp        
    }// end processChild()
    
  };// end helpers hash
  
  
  // Returns an array of all deeply nested children for you to loop over.
  // Each item has a few properties like the title from the parent's hasMany definition
  // and the .level into the stack. To get the action child use .object
  // There is also a inDisplayGroup() function so you can see if that association
  // is in a particular display group.
  // Note, the first item this returns is the model itself
  newModel.childAssociations = Ember.computed('childAssociationDidChange', function(key, value){
    if(value !== undefined){return value;}// skip computing if setting
    var self = this;
    var out = Ember.A([]);
    var finalResolve;
    
    var promise = new Ember.RSVP.Promise(function(resolve) {
      finalResolve = resolve;// pass this to outer scope.
    });
    
    
    // make an array to return.
    var promiseArray =  DS.PromiseArray.create({
      promise: promise,
      content: out
    });
    
    // Push associations on the the promise array's content.
    self.everyChildAssociation(function (assoc) {
      promiseArray.content.pushObject(assoc);
    }).then(function(){
      // report back that we are all done.
      finalResolve(promiseArray.content);
    });
    
    return promiseArray;
  });

  
  // Same as .childAssociations() but does a callback whenver
  // a child has finished loading.
  newModel.everyChildAssociation = function(callback, childMeta){
    var self = this;
    
    if (childMeta === undefined){
      childMeta = AssociationDescriptor.extend({
        title:        Ember.computed.alias('object.displayTitle'),
        diplayGroups: [],
      }).create({
        //attrName:      'self',
        object:        self,
        collection:    [],
        level:         0,
      });
    } else {
      
    }

    callback(childMeta);
    var nextLevel = childMeta.level + 1;
    
    var rsvp = new Ember.RSVP.Promise(function(everyChildAssociationResolve) {
      
      var childNames = self.definedChildAssociations.slice(0);// clone array
      if (childNames.length === 0 ) {
        everyChildAssociationResolve();// no children to process. Just resolve.
        return;
      }
      
      var eachChildRsvp = new Ember.RSVP.Promise(function(eachChildResolve) {
        // Process each child, then we're notify that we're done.
        self.helpers.processChildNames(self, callback, childNames, nextLevel).then(function () {
          eachChildResolve();
          return;
        }, 'everyChildAssociation -> eachChildRsvp ' + self);
        
      }, 'eachChildRsvp ' + childNames + ' ' + self);
      
      // All children are done. Pass the word on.
      eachChildRsvp.then(function () {
        everyChildAssociationResolve();
        return;
      });
      
    }, 'everyChildAssociation ' + self); // end rsvp
    return rsvp;
  };//end everyChildAssociation
  
  
  // When saving, you need to save belongsTo first so that
  // they have an ID to store. After they have all been save,
  // then you can save your self and the hasManys.
  newModel.deepSave = function () {
    return new Ember.RSVP.Promise(function(finalSaveResolve) {
      this.deepSaveBelongsTo().then(function (saved) {
        saved.deepSaveHasMany().then(function (savedAgain) {
          finalSaveResolve(savedAgain);
        });
      });
    });
  };
  
  // In order to save a model all the belongTo relationships need
  // to have an ID set. This function saves all the belongsTo
  // relationships then saves itself.
  newModel.deepSaveBelongsTo = function () {
    var self = this;
    var hasManys = this.get('definedHasManyAssociations');
    var childSaveRsvps = Ember.A();// Keep a list of children we are saving.
    
    var finalSaveRsvp = new Ember.RSVP.Promise(function(finalSaveResolve) {
      // Get all children
      self.get('childAssociations').then(function (childAssociations) {
        childAssociations.forEach(function (childAssoc) {
          if (childAssoc.level === 0){return;}// skip self. Will save last.
          if (hasManys.indexOf(childAssoc.attrName) > -1) {return;}// don't save any hasManys
          
          // Only go one level deep - let the child save it's own children.
          if (childAssoc.level === 1){
            if (childAssoc.object.deepSaveBelongsTo){
              childSaveRsvps.pushObject( childAssoc.object.deepSaveBelongsTo() );
            }else{
              // support non model builder models
              childSaveRsvps.pushObject( childAssoc.object.save() );
            }
          }
        });
        
        // Wait for all children to be saved, then do final resolve
        Ember.RSVP.all(childSaveRsvps, 'deepSaveBelongsTo').then(function () {
          self.save().then(function(savedSelf){
            finalSaveResolve(savedSelf);
          });
        });
        
      });// end get childAssociations
      
    });
    return finalSaveRsvp;
  };
  
  
  //  TODO: Can't do hasOne because it's belongs to and will need to save
  //        the child first.
  // Save yourself, then save all of your hasMany or hasOne relationships
  // TODO: I think there might be a bug where this only works one level deep.
  // It wont wait for a the child's child's parent to be saved.
  newModel.deepSaveHasMany = function () {
    var self           = this;
    var hasManys       = this.get('definedHasManyAssociations');
    var childSaveRsvps = Ember.A();// Keep a list of children we are saving.
    
    var finalSaveRsvp = new Ember.RSVP.Promise(function(finalSaveResolve) {
      // Save your self
      self.save().then(function (savedSelf) {
        // Then get children
        savedSelf.get('childAssociations').then(function (childAssociations) {
          
          childAssociations.forEach(function (childAssoc) {
            if (childAssoc.level === 0){return;}// skip self. already saved
            if (hasManys.indexOf(childAssoc.attrName) == -1) {return;}// don't save belongs to.
            
            if (childAssoc.level === 1){
              if (childAssoc.object.deepSaveHasMany){
                // create recursion where it will save itself, wait, then save level 1 children.
                childSaveRsvps.pushObject( childAssoc.object.deepSaveHasMany() );
              }else{
                // support non model builder models
                childSaveRsvps.pushObject( childAssoc.object.save() );
              }
            }
          });
          
          // Wait for all children to be saved, then do final resolve
          Ember.RSVP.all(childSaveRsvps, 'deepSaveHasMany').then(function () {
            finalSaveResolve(self);
          });
          
        });// end get childAssociations
      });// end self seave
      
    });
    return finalSaveRsvp;
  };
  
  
  // Save yourself, then save all of your hasMany or hasOne relationships
  newModel.deepDestroy = function () {
    var self       = this;
    var childRsvps = Ember.A();
    
    var finalRsvp = new Ember.RSVP.Promise(function(finalResolve) {
      self.get('childAssociations').then(function (childAssociations) {
        // Delete the children first.
        var reverseChildAssociations = childAssociations.reverse();
        reverseChildAssociations.forEach(function (childAssoc) {
          childRsvps.pushObject( childAssoc.object.destroyRecord() );
        });
        
        // Wait for all children to be saved, then do final resolve
        Ember.RSVP.all(childRsvps, 'deepDestroy').then(function () {
          finalResolve();
        });
        
      });// end get childAssociations
    });
    return finalRsvp;
  };
  
  
  // Figure out which children this model has
  var childPropsToWatch = [];
  for(var attrName in (modelConfig.attributes || {}) ){
    var attrConfig = modelConfig.attributes[attrName];
    
    if (attrConfig.hasOne !== undefined){
      // Watch for when the child is added/removed
      childPropsToWatch.push(attrName + '.id');
      childPropsToWatch.push(attrName + '.childAssociationDidChange');
    }
    
    if (attrConfig.hasMany !== undefined) {
      childPropsToWatch.push(attrName + '.@each.childAssociationDidChange');
    }
  }//end foreach
  
  
  // Wrap childPropsToWatch in quotes and join together
  // to make somethign we can pass to .property() in an eval.
  // Returns: " 'fooId', 'bar.@each.childAssociationDidChange' "
  // var propsToObserve = childPropsToWatch.map(function(c){
  //   return "'" + c + "'";
  // }).join(',');
  
  
  // The childAssociationDidChange is a property that will
  // change whenever a child has been added / removed.
  // It wont tell us if any attributes way down in the 
  // nest have been changed.
  newModel.childAssociationDidChange = 0;
  newModel.childAssocationChangeObserver = Ember.observer(childPropsToWatch, function(){
    this.incrementProperty('childAssociationDidChange');
  });
  
  
  //propsToObserve = "newModel.childAssocationChangeObserver.observes("+propsToObserve+")";
  //newModel.childAssocationChangeObserver = eval(propsToObserve);
  
  
  return newModel;
}// end function
  
