import Ember from "ember";
export default function(modelConfig) {
  
  // Since EmberData doesn't support hasOne,
  // they are mapped to a belongsTo relationship.
  // Those are considered "fake belongsTos"
  var realBelongsToAssociations = [];
  for(var attrName in (modelConfig.attributes || {}) ){
    // pull out the attribute configuration for the one we are working on
    var attrConfig = modelConfig.attributes[attrName];
    
    if (attrConfig.belongsTo !== undefined) {
      realBelongsToAssociations.push(attrName);
    }
  }// end foreach
  
  return {
    // Recursively serializes models. It will skip real belongs to
    // so that it doesn't cause recursion.
    realBelongsToAssociations: realBelongsToAssociations,
    archive: Ember.computed(function() {
      var json = {};
      var self = this;
      var exceptions = self.get('realBelongsToAssociations');
      
      json['id'] = self.get('id');
      
      self.eachAttribute(function(name) {
        json[name] = self.get(name);
      });
      
      self.eachRelationship(function(name, relationship) {
        if (relationship.kind === 'hasMany') {
          json[name] = self.get(name).mapBy('archive');
        } else if (relationship.kind === 'belongsTo' && exceptions.indexOf(name) < 0) {
          json[name] = self.get(name).get('archive');
        }
      });
      return json;
    }),
  };// end return
}// end export
