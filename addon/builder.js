import DS                from 'ember-data';
import IstModelBase      from 'ember-ist-model-builder/base';
import IstModelDecorator from 'ember-ist-model-builder/decorator';

function IstModelBuilder(modelConfig) {  
  // Build our base model.
  var newModel = new IstModelBase(modelConfig);
  
  if (modelConfig.decoratorModel) {
    return new IstModelDecorator(newModel);
  } else{
    // Now return an Ember model.
    return DS.Model.extend(newModel);
  }
}

export default IstModelBuilder;
