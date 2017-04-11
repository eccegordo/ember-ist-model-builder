import Ember from 'ember';
import IstModelBuilder from 'dummy/lib/ist-model-builder';

export default IstModelBuilder({
  // Optional, set/add/remove all attributes from display groups like so:
  defaultDisplayGroups:        ['default'],
  defaultDisplayGroupsInclude: ['print'],
  defaultDisplayGroupsExclude: ['summary'],

  // Type title used to label the model in dispay
  typeTitle: "Student",

  attributes: {
    // Basic attr definition - Append summary to the display groups.
    name:   {type:'string', defaultValue: '', displayGroupsInclude: ['summary', 'print'], editable: true},
    school: {belongsTo: "school", editable: true},

    // Default type is raw, defaultValue is null. Can also exclude from a default group
    notes:  {displayGroupsExclude: ['print'], editable: true},

    // Can change the title, set a unit, and custom formatter function
    // Default formatter is the value (rounded if float) plus the unit (if given).
    age: {
      title: "Student's Age",
      unit: 'years',
      formatter: function (value, unit) {
        return value + " " + unit + " old";
      },
      editable: true
    },

    // Can also do a computed property by setting value
    dogYears: {
      title: "Age in Dog years",
      value: Ember.computed('age', function() {
        return this.get('age') * 7;
      }),
      editable: true
    },

    // hasMany works like this:
    friends: {hasMany: "friend"},

    // hasOne is supported but maps to DS.belongsTo()
    // Using hasOne helps determine how to use this property
    // for display and saving.
    address: {hasOne: "address", editable: true},

  },// end attributes

}).extend({
  // You can use .extend() to add any computed properties or functions
  // that don't need to be displayed or have formatters for.

});
