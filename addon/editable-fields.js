import Ember from 'ember';
import { attrToTitle }        from 'ember-ist-model-builder/display-helpers';
import IstModelDisplayHelpers from 'ember-ist-model-builder/display-helpers';
import ChainedProxyMixin      from 'ember-ist-model-builder/chained-proxy-mixin';


// Implements chained proxy so we can have default settings and custom settings.
// Call `fieldSetting.applyCustomSettings({label: "Other label"})` to override defaults.
export var EditableFieldSettingsManager = Ember.Object.extend(ChainedProxyMixin, {
  applyCustomSettings: function (settings) {
    this.contents.unshiftObjects([settings]);
  },
  
});

export var EditableFieldSettingsObject = Ember.Object.extend({
  isBelongsTo: Ember.computed('valueType', function(){return this.get('valueType') === 'belongsTo';}),
  isHasMany:   Ember.computed('valueType', function(){return this.get('valueType') === 'hasMany';}),
  isHasOne:    Ember.computed('valueType', function(){return this.get('valueType') === 'hasOne';}),
  isRelationship: Ember.computed('valueType', function(){
    return this.get('valueType') === 'belongsTo' ||
      this.get('valueType') === 'hasMany' ||
      this.get('valueType') === 'hasOne';
  }),
  
  isString:  Ember.computed('valueType', function(){return this.get('valueType') === 'string';}),
  isNumber:  Ember.computed('valueType', function(){return this.get('valueType') === 'number';}),
  isBoolean: Ember.computed('valueType', function(){return this.get('valueType') === 'boolean';}),
  isDate:    Ember.computed('valueType', function(){return this.get('valueType') === 'date';}),
  isRaw:     Ember.computed('valueType', function(){return this.get('valueType') === 'raw';}),
  
});



export function editableFieldsFor(object){
  var attrConfigs;
  var attrs, label;
  var fields = Ember.A();

  if (object.get && object.get('modelConfig') !== undefined){
    attrConfigs = object.get('modelConfig').attributes;
    attrs       = Ember.keys(attrConfigs);
  } else {
    attrConfigs = Ember.keys(object);// no configs
    attrs       = Ember.keys(object);
  }
  
  for(var i = 0; i < attrs.length; i++) {
    var attrName = attrs[i];
    if(IstModelDisplayHelpers.alwaysHiddenFields.indexOf(attrName) > -1){continue;}

    // pull out the attribute configuration for the one we are working on
    var attrConfig = attrConfigs[attrName];
    var valueType        = 'raw';
    var associationModel = null;// which model the belongsTo or hasMany is refering to.
    if (attrConfig === undefined){attrConfig = {};}
    
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
    
    var defaultSettings = EditableFieldSettingsObject.extend({
      value:            Ember.computed.alias('subject.' + attrName),
      unit:             Ember.computed.alias('subject.' + attrName + 'Unit'),
      valueFormatted:   Ember.computed.alias('subject.' + attrName + 'Formatted'),
      
    }).create({
      subject:          object,
      attrName:         attrName,
      label:            label,
      valueType:        valueType,
      associationModel: associationModel,
    });

    var manager = EditableFieldSettingsManager.create({
      contents: Ember.A([defaultSettings])// make sure ember array so binding works properly
    });
    
    fields.push(manager);
  }
  return fields;
}

export default function() {
  return {
    // Returns a list of fields that you can build a form element for.
    // It provies the type of attribute and any associated models.
    editableFields: Ember.computed('modelConfig.attributes', function(){
      return editableFieldsFor(this);
    }),
  };// end return
}// end export
