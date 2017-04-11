import Ember             from 'ember';
import DS                from 'ember-data';
import IstModelBase      from 'ember-ist-model-builder/base';

import IstModelChildrenHelpers  from 'ember-ist-model-builder/children-helpers';
import IstModelDisplayHelpers   from 'ember-ist-model-builder/display-helpers';
import IstModelEditableFields   from 'ember-ist-model-builder/editable-fields';
import IstModelArchive          from 'ember-ist-model-builder/archive';
import IstModelDecorator from 'ember-ist-model-builder/decorator';

const {apply} = Ember.$.extend;
const {extend} = DS.Model;

function IstModelBuilder(modelConfig) {
  var extensions = [];// array of objects we will merge together to make our final model.

  IstModelBuilder.defaultMixins.forEach(function (mixin) {
    extensions.push( mixin(modelConfig) );
  });

  // See if there were any one off mixins defined in the model config.
  if (modelConfig.mixins) {
    modelConfig.mixins.forEach(function (mixin) {
      extensions.push( mixin(modelConfig) );
    });
  }

  // Merge all those objects together to make our final config for DS.Model.
  var newModel = apply(null, extensions);
  var outClass = null;

  if (modelConfig.decoratorModel) {
    outClass = new IstModelDecorator(newModel);
  } else{
    // Now return an Ember model.
    outClass = extend(newModel);
  }

  // Attach the model config to the class
  outClass.reopenClass({
    modelConfig: modelConfig
  });
  return outClass;
}

IstModelBuilder.defaultMixins = [
  IstModelBase,
  IstModelDisplayHelpers,
  IstModelEditableFields,
  IstModelArchive,
  IstModelChildrenHelpers
];


export default IstModelBuilder;
