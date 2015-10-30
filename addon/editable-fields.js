import Ember from 'ember';
import { attrToTitle }        from 'ember-ist-model-builder/display-helpers';
import IstModelDisplayHelpers from 'ember-ist-model-builder/display-helpers';
import ChainedProxyMixin      from 'ember-ist-model-builder/chained-proxy-mixin';

const {computed} = Ember;


// Implements chained proxy so we can have default settings and custom settings.
// Call `fieldSetting.applyCustomSettings({label: "Other label"})` to override defaults.
export var EditableFieldSettingsManager = Ember.Object.extend(ChainedProxyMixin, {
  applyCustomSettings: function (settings) {
    this.contents.unshiftObjects([settings]);
  },

});

export var EditableFieldSettingsObject = Ember.Object.extend({
  isBelongsTo: computed('valueType', function(){return this.get('valueType') === 'belongsTo';}),
  isHasMany:   computed('valueType', function(){return this.get('valueType') === 'hasMany';}),
  isHasOne:    computed('valueType', function(){return this.get('valueType') === 'hasOne';}),
  isRelationship: computed('valueType', function(){
    return this.get('valueType') === 'belongsTo' ||
      this.get('valueType') === 'hasMany' ||
      this.get('valueType') === 'hasOne';
  }),

  isString:  computed('valueType', function(){return this.get('valueType') === 'string';}),
  isNumber:  computed('valueType', function(){return this.get('valueType') === 'number';}),
  isBoolean: computed('valueType', function(){return this.get('valueType') === 'boolean';}),
  isDate:    computed('valueType', function(){return this.get('valueType') === 'date';}),
  isRaw:     computed('valueType', function(){return this.get('valueType') === 'raw';}),

});



export function editableFieldsFor(object){
  var attrConfigs;
  var attrs, label;
  var fields = Ember.A();


  if (object.get && object.get('modelConfig') !== undefined){
    // if this is a proxy then get the real content so we can get the keys
    if (object.get('content') !== undefiend) {
      object = object.get('content');
    }
    attrConfigs = object.get('modelConfig').attributes;
    attrs       = Object.keys(attrConfigs);
  } else {
    attrConfigs = Object.keys(object);// no configs
    attrs       = Object.keys(object);
  }

  for(var i = 0; i < attrs.length; i++) {
    var attrName = attrs[i];
    if(IstModelDisplayHelpers.alwaysHiddenFields.indexOf(attrName) > -1){continue;}

    // pull out the attribute configuration for the one we are working on
    var attrConfig = attrConfigs[attrName];
    var valueType        = 'raw';
    var associationModel = null;// which model the belongsTo or hasMany is refering to.

    // if no attrConfig, set some defaults
    if (attrConfig === undefined){
      attrConfig = {
        editable: true
      };
    }

    // Editable = false by default
    // attrConfig must have editable=true to add field to form
    if (attrConfig.editable !== true){
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
      value:            computed.alias('model.' + attrName),
      unit:             computed.alias('model.' + attrName + 'Unit'),
      valueFormatted:   computed.alias('model.' + attrName + 'Formatted'),

    }).create({
      model:            object,
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
    editableFields: computed('modelConfig.attributes', function(){
      return editableFieldsFor(this);
    }),
  };// end return
}// end export
