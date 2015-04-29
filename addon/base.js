import Ember                    from 'ember';
import DS                       from 'ember-data';

var IstModelBase = function(modelConfig) {
  var newModel = {
    modelConfig: modelConfig,// Stash this so we can use it later    
    
    // Save a list of attributes that we can display.
    // The order they are defined is the order they will be displayed in a table
    definedAttributes:          [],
    definedChildAssociations:   [],
    definedHasOneAssociations:  [],
    definedHasManyAssociations: [],
    
  };// end newModel Object
  
  
  // Now configure the new model's attributes
  // Loop through each key in the attr hash and build up the property.
  for(var attrName in (modelConfig.attributes || {}) ){
    // pull out the attribute configuration for the one we are working on
    var attrConfig = modelConfig.attributes[attrName];
    
    // ============================================================
    
    var async = attrConfig.async !== undefined ? attrConfig.async : true;
    
    // Check if we are trying to build an association.
    if (attrConfig.belongsTo !== undefined) {
      if (attrConfig.value) {
        // allow overriding the DS.belongsTo
        newModel[attrName] = attrConfig.value;
      } else {
        newModel[attrName] = DS.belongsTo(attrConfig.belongsTo, {async: async} );
      }
      continue;// go to next attr
    }
    
    // Use belongsTo if they call a hasOne
    if (attrConfig.hasOne !== undefined) {
      newModel.definedChildAssociations.push(attrName);
      newModel.definedHasOneAssociations.push(attrName);
      if (attrConfig.value) {
        // allow overriding the DS.belongsTo
        newModel[attrName] = attrConfig.value;
      } else {
        newModel[attrName] = DS.belongsTo(attrConfig.hasOne, {async: async} );
      }
      continue;// go to next attr
    }
    
    if (attrConfig.hasMany !== undefined) {
      newModel.definedChildAssociations.push(attrName);
      newModel.definedHasManyAssociations.push(attrName);
      if (attrConfig.value) {
        // allow overriding the DS.hasMany
        newModel[attrName] = attrConfig.value;
      } else {
        newModel[attrName] = DS.hasMany(attrConfig.hasMany, {async: async} );
      }
      continue;// go to next attr
    }
    
    // If it wasn't an association (made it past the continues), then it's an attr
    // not an association. Add it to the attr list.
    newModel.definedAttributes.push(attrName);// Add this to our list of attributes
    
    // Must be a regular old attribute.
    // Set the defaults.
    if (attrConfig.type    === undefined) {attrConfig.type = 'raw';}
    if (attrConfig.defaultValue === undefined) {attrConfig.defaultValue = null;}
    
    // Now assign the attribute to the model
    if (attrConfig.value !== undefined){
      // User may have passed in a custom value.
      newModel[attrName] = attrConfig.value;
    }else{
      // Use standard ember DS.attr
      newModel[attrName] = DS.attr(attrConfig.type, {defaultValue: attrConfig.defaultValue});
    }
    
  }// end each attr
  
  return newModel;
  
}// end export function




export default IstModelBase;
