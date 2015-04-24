import Ember from 'ember';
import IstModelBuilder from 'dummy/lib/ist-model-builder';

export default IstModelBuilder({
  
  // Type title used to label the model in dispay
  
  attributes: {
    name: {type:'string', defaultValue: ''},// basic attr definition.
    notes:  {},// defaults to type raw, defaultValue null
    
    // Can change the title, set a unit, and custom formater function
    // Default formatter is the value (rounded if float) plus the unit (if given).
    age: {
      title: "Student's Age",
      unit: 'years',
      formatter: function (value, unit) {
        return value + " " + unit + " old";
      }
    },
    
    // Can also do a computed property by setting value
    dogYears: {
      title: "Age in Dog years",
      value: Ember.computed('age', function() {
        return this.get('age') * 7;
      })
    },
    
    // hasMany works like this:
    friends: {hasMany: "friend"},
    
    // hasOne is supported but maps to DS.belongsTo()
    // Using hasOne helps determine how to use this property
    // for display and saving.
    address: {hasOne: "address",
              formatter: function (value) {
                return value.get("textAddress");
              }
             },
    
  },// end attributes
  
}).extend({
  // You can use .extend() to add any computed properties or functions
  // that don't need to be displayed or have formatters for.
  
});

