# ember-ist-model-builder


## Installation
* Add `"ember-ist-model-builder": ">=0.1.0",` to your `package.json` file under `devDependencies`.
* `npm install`

## Usage

### Example Model
```javascript
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
    name:   {type:'string', defaultValue: '', displayGroupsInclude: ['summary']},
    
    // Default type is raw, defaultValue is null. Can also exclude from a default group
    notes:  {displayGroupsExclude: ['print']},
    
    // Can change the title, set a unit, and custom formatter function
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
    address: {hasOne: "address"},
    
  },// end attributes
  
}).extend({
  // You can use .extend() to add any computed properties or functions
  // that don't need to be displayed or have formatters for.
  
});
```

### Base Model Extensions `IstModelBase`
The following properties will be defined on each new model.

```javascript
model.get('modelConfig');// what was passed to the model builder.
model.get('definedAttributes');
model.get('definedChildAssociations');
model.get('definedHasOneAssociations');
model.get('definedHasManyAssociations');
```

### Display Helpers `IstModelDisplayHelpers`
The display helpers will attach the `attrTitle`, `attrFormatted`, and `attrUnit` properties
to your models. This allows you to define the title, formatter, and unit in one location
and allows you to dynamically build UI components that are agnostic to the type of model
that it is working with. Examples:

```handlebars
<h3>{{model.typeTitlePlural}}</h3><!-- Would be "Students" -->
<p>
  {{model.firstNameTitle}}:
  {{model.firstNameFormatted}}<br/>
  
  {{model.ageTitle}}: 
  {{model.age}} ({{model.ageUnit}}):<br/>
</p>
```

For each display group that you define, a `____DisplayAttributes` property will be added to the model.
The array that is returned allows you to do things like this:

```handlebars
<h3>{{model.displayTitle}}</h3> <!-- Might be something like "Student: Jimmy Jones"-->
<p>
  {{#each attr in model.printDisplayAttributes}}
    <label>{{attr.title}}:</label>
    {{attr.valueFormatted}}  {{attr.unit}}<br/>
  {{/each}}
</p>
```

Every attribute is included in the `default` display group so `model.defaultDisplayAttributes` should always be available. The default formatter is the value (rounded if float) plus the unit (if given).

#### Other display helpers:
```javascript
// Inside your attribute formatters you have access to these helper methods:
this.roundNumber(someNumber, decimalPlaces);
this.prettyPercent(someFraction, decimalPlaces);// returns localized formatted percent number. Use 0.5 for 50%
this.prettyNumber(12345.6723, 2);// returns localized formatted number: 12,345.67

// You can also import the function that converts attribute names to titles
import {attrToTitle} from 'your-app/lib/ist-model-display-helpers';
attrToTitle('fooBarBaz'); // returns 'Foo Bar Baz'
```

### Children Helpers `IstModelChildrenHelpers`

##### deeSave()
`model.deepSave()` will recursively save the model and also any hasOne and hasMany relationships.

##### childAssociations
`model.get('childAssociations')` will return a PromiseArray that will contain one *association descriptor object*
for every deeply nested hasOne/hasMany relationship.
*Note,* the first item this returns is the model itself and the order that they objects are pushed onto
the array is the same order as they were defined in the model.

The association descriptor object has these properties:
* `.object` - Contains the actual child itself.
* `.title` which came from the parent's hasMany/hasOne definition.
* `.level` - How many levels off association have been traversed.
* `.collection` - The collection of children the association came from if it was a hasMany relationship.
* `.displayGroups` - The displayGroups that were defined on that hasMany/hasOne relationship.
* `.inDisplayGroup()` function so you can see if that association is in a particular display group.

##### everyChildAssociations()
Same as `.childAssociations` but does a callback whenever a child has finished loading.

```javascript
model.everyChildAssociations(function (assoc) {
  console.log("Child: ", assoc.object.get('displayTitle'));
});
```

#### childAssociationDidChange
If you need to be notified whenever a deeply nested relationship has been addded or removed you can observe the `childAssociationDidChange` property. It wont tell you if an attribute changed on a related object however. Use it to get your bindings to update when new relationships are added/removed.


### Archive `IstModelArchive`
Adds a `model.get('archive')` computed property that returns a JSON object that has all the deeply nested relationships attached to it.


### Editable Fields `IstModelEditableFields`
Adds a `model.get('editableFields')` computed property that returns an array of objects that describe each attribute which can be used to automatically build a form. It will respect the `IstModelDisplayHelpers.alwaysHiddenFields` and you can disable editing an attribute by adding `editable: false` to the attribute's config when defining the model.

```javascript
// Field descriptor object:
field.get('attrName');
field.get('label');// comes from the title
field.get('value');// live binded to the model's value
field.get('valueType');// raw, boolean, number, string, hasOne, hasMany, belongsTo
field.get('associationModel');// if the attribute is a relationship, this will be the model name suitable for a store.find()
```

## Customization

Add an initializer to customize the model builder.

```javascript
import IstModelDisplayHelpers from 'your-app/lib/ist-model-display-helpers';

export default {
  name: 'ist-model-builder',
  initialize: function(container, app) {
    // List of fields you never want shown in the app
    IstModelDisplayHelpers.alwaysHiddenFields.concat([
      'status',
      'createdAt',
      'updatedAt',
    ]);
    
    // Strings who have unusual casing. Use lowercase as key.
    IstModelDisplayHelpers.specialStringTitles = {
      'hdd':   "HDD",
      'ssd':   'SSD',
      'ram':   "RAM",
    };
    // By default add every attribute to the `print` display group.
    IstModelDisplayHelpers.defaultDisplayGroups.push('print');
  }// end init fn
};
```


### Custom Extensions
You can add your own add your own extensions to the model builder. Here is an example custom extension that will append a `____InExport` attribute for every attribute that was define so the user can visibility toggle on/off.

```javascript
import DS from 'ember-data';
export default function IstModelInExport(modelConfig) {
  var newModel = {};
  for(var attrName in (modelConfig.attributes || {}) ){
    var attrConfig = modelConfig.attributes[attrName];
    if (attrConfig.belongsTo  || attrConfig.hasOne || attrConfig.hasMany) {
      continue;// Don't add any inExport attrs for relationships.
    }
    // Add an inexport attribute for all other attributes defined.
    newModel[attrName + 'InExport'] = DS.attr('boolean', {defaultValue: true});
  }
  return newModel;
}
```

In your initializer push your custom extension onto `IstModelBuilder.defaultMixins`.

```javascript
import IstModelBuilder from 'your-app/lib/ist-model-builder';
IstModelBuilder.defaultMixins.push(IstModelInExport);
```

If you just want your extension in a few models you can also specify it when configuring your model.
```javascript
import IstModelBuilder from 'your-app/lib/ist-model-builder';
export default IstModelBuilder({
  mixins: [IstModelInExport],
  attributes: {
    name: {}
  }
});
```
