import Ember from 'ember';
import { attrToTitle }        from 'ember-ist-model-builder/display-helpers';
import IstModelDisplayHelpers from 'ember-ist-model-builder/display-helpers';

export default function() {
  return {
    // Returns a list of fields that you can build a form element for.
    // It provies the type of attribute and any associated models.
    editableFields: Ember.computed('modelConfig.attributes', function(){
      var modelConfig = this.get('modelConfig');
      var self = this;
      var fields = [];
      for(var attrName in (modelConfig.attributes || {}) ){
        if(IstModelDisplayHelpers.alwaysHiddenFields.indexOf(attrName) > -1){continue;}
        // pull out the attribute configuration for the one we are working on
        var attrConfig = modelConfig.attributes[attrName];
        
        var valueType        = 'raw';
        var associationModel = null;// which model the belongsTo or hasMany is refering to.

        // Allow configuring to disable editing.
        if (attrConfig.editable !== undefined && attrConfig.editable === false){
          continue;
        }

        if (attrConfig.belongsTo){
          valueType         = 'belongsTo';
          associationModel  = attrConfig.belongsTo;
        } else if (attrConfig.hasMany){
          valueType         = 'hasMany';
          associationModel  = attrConfig.hasMany;
        } else if (attrConfig.hasOne){
          valueType         = 'hasOne';
          associationModel  = attrConfig.hasOne;
        } else if (attrConfig.type){
          valueType         = attrConfig.type;
        }
        
        if (attrConfig.title) {
          label = attrConfig.title;
        } else {
          label = attrToTitle(attrName);
        }
    
        var field = Ember.Object.extend({
          subject:          self,
          attrName:         attrName,
          label:            label,
          value:            Ember.computed.alias('subject.' + attrName),
          valueType:        valueType,
          associationModel: associationModel,
        }).create();
        fields.push(field);
      }
      return fields;
    }),
  };// end return
}// end export
