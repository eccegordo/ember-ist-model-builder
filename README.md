# ember-ist-model-builder


## Installation
* Add `"ember-ist-model-builder": ">=0.1.0",` to your `package.json` file under `devDependencies`.
* `npm install`

## Usage

### Example Model
```javascript

```

## Display Helpers
The display helpers will attach the `attrTitle`, `attrFormatted`, and `attrUnit` properties
to your models.

```handlebars
<h3>{{model.typeTitle}}</h3>
<p>
  {{model.firstNameTitle}}:
  {{model.firstNameFormatted}}<br/>
  
  {{model.ageTitle}} ({{model.ageUnit}}):
  {{model.age}}<br/>
  
  {{model.dogYearsTitle}}:
  {{model.dogYearsFormatted}} {{model.dogYearsUnit}}<br/>
</p>
```

## Children Helpers

##### deeSave()
`model.deepSave()` will recursivly save the model and also any hasOne and hasMany relationships.

##### childAssociations
`model.get('childAssociations')` will return a PromiseArray that will contain one association descriptor object
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
Same as `.childAssociations` but does a callback whenver a child has finished loading.

```javascript
model.everyChildAssociations(function (assoc) {
  console.log("Child: ", assoc.object.get('displayTitle'));
});
```

### childAssociationDidChange
If you need to be notified whenever a deeply nested relationship has been addded or removed you can observe the `childAssociationDidChange` property. It wont tell you if an attribute changed on a related object however. Use it to get your bindings to update when new relationships are added/removed.

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
    
  }// end init fn
};
```
