import Ember from "ember";
import DS from 'ember-data';

function IstModelDisplayHelpers(modelConfig) {
  var newModel = {
    // This is a pretty version of the model name.
    typeTitle: Ember.computed(function(){
      var title = this.get('modelConfig').typeTitle;
      if (title === undefined) {
        title = Ember.String.capitalize(Ember.String.dasherize(this.constructor.typeKey.toString()).replace(/\-/g, ' '));
      }
      return title;
    }),

    // Use for a listing of models
    typeTitlePlural: Ember.computed('typeTitle', function(){
      return Ember.Inflector.inflector.pluralize(this.get('typeTitle'));
    }),
    
    // Default title will be the type title plus name or title attribute, if defined.
    displayTitle: Ember.computed('typeTitle', 'name', 'title', function () {
      var name = this.get('name');
      var title = this.get('title');
      var typeTitle = this.get('typeTitle');
      
      if (!Ember.isBlank(name)){
        return typeTitle + ': ' + name;
      } else if (!Ember.isBlank(title)){
        return typeTitle + ': ' + title;
      } else {
        return typeTitle;
      }
    }),
    
    // Return attrs that have are in a list of display groups.
    // Pass in a string for a single, or an array of groups.
    attributeNamesForDisplayGroup: function (groups) {
      var results = [];
      var self = this;
      if (typeof groups === 'string'){groups = [groups];}// ensure it's an array.
      
      var definedAttributes = self.get('definedAttributes');
      
      // See if we are using a decoratorModel, add those attributes to our list too.
      if (self.modelConfig.decoratorModel && self.get('proxyKind') ) {
        var content = self.get('content');
        if (content){
          definedAttributes = definedAttributes.concat(content.get('definedAttributes'));
        }
      }
      
      definedAttributes.forEach(function (attrName) {
        if (attrName === undefined){return;}
        groups.forEach(function (group) {
          if (typeof self.get(attrName + 'DisplayGroups') === 'object' && self.get(attrName + 'DisplayGroups').indexOf(group) === -1) {
            return;
          }
          
          results.push(attrName);
        });
      });
      
      // Remove any that are nil if requested
      results = results.filter(function (attr) {
        try {
          var attrConfig = self.modelConfig.attributes[attr];
          var value = self.get(attr);
          
          if (self.modelConfig.decoratorModel && attrConfig === undefined) {
            attrConfig = self.get('content').modelConfig.attributes[attr];
          }

          if(attrConfig.hideIfBlank && (value === null || value === undefined || value === 0 || value === '')){
            return false;
          } else {
            return true;
          }
        }catch(e){
          console.error(e);
          return true;
        }
      });
      
      return results;
    },
    
    // Returns a new object for each attribute in a display group
    // that will have a standard interface for getting title, formatted, unit, etc.
    attributeDescriptorsForDisplayGroup: function (displayGroup) {
      var self = this;
      var attrs = this.attributeNamesForDisplayGroup(displayGroup);
      var out = this.attributeNamesForDisplayGroup(displayGroup).map(function (attrName) {
        return Ember.Object.extend({
          title:          Ember.computed.alias('model.' + attrName + 'Title'),
          value:          Ember.computed.alias('model.' + attrName),
          valueFormatted: Ember.computed.alias('model.' + attrName + 'Formatted'),
          displayGroups:  Ember.computed.alias('model.' + attrName + 'DisplayGroups'),
          unit:           Ember.computed.alias('model.' + attrName + 'Unit'),
        }).create({
          attrName: attrName,
          model:    self,
        });
      });
      return Ember.A(out);
    },
    
    // Round floats, other wize return value with unit attached
    defaultFormatter: function(value, unit){
      var formatted = '';
      if (value === null || value === undefined) {
        return formatted;
      }
      if (value.valueOf){value = value.valueOf();}
      if (typeof value === "number") {
        formatted = this.prettyNumber(value);
      }else{
        formatted = value.toString();
      }
      
      if (unit !== undefined) {
        formatted = formatted + " " + unit;
      }
      return formatted;
    },
    
    roundNumber: function(number, decimals){
      if(Math.round(number) === number || decimals === 0){
        number = Math.round(number);
      }else{
        number = Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
      }
      return number;
    },

    // Use decimals for the percentage. IE, 50% = 0.5
    // tries to use i18n percent unless it's Safari it just uses english style.
    prettyPercent: function(number, decimals){
      if (decimals === undefined){decimals = 0;}
      if (!!window.Intl && window.locale){
        return new window.Intl.NumberFormat(window.locale, {style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(number);
      } else {
        number = number * 100;
        number = this.roundNumber(number, decimals);
        return number + '%';
      }
    },
    
    // tries to use i18n large numbers unless it's Safari it just uses english style.
    prettyNumber: function(number, decimals){
      if (decimals === undefined){decimals = 2;}
      // Never round to zero, give at least once decimal
      if (number > -1 && number < 1 && number !== 0.0 && decimals === 0){
        decimals = 1;
      }
      number = this.roundNumber(number, decimals);
      if (!!window.Intl && window.locale){
        return new window.Intl.NumberFormat(window.locale).format(number);
      }else{
        return number + '';
      }
    },
    
  };// end obj
  
  
  // Now configure the new model's attributes
  // Loop through each key in the attr hash and build up the property.
  var allDisplayGroupNames = [];// also keep track of unique display groups
  for(var attrName in (modelConfig.attributes || {}) ){
    // pull out the attribute configuration for the one we are working on
    var attrConfig = modelConfig.attributes[attrName];  
    
    // --------------- Do Display Attr logic --------------------------
    
    // Set the attrTitle property
    if (attrConfig.title   === undefined) {
      attrConfig.title = attrToTitle(attrName); // Default: turnCamelCase to "Turn Camel Case"
    }
    newModel[attrName + "Title"] = attrConfig.title;
    
    // Set the attrUnit property
    newModel[attrName + "Unit"] = attrConfig.unit;
    
    
    // Build the array of display groups. Dupe the array so it doesn't mutate original
    var groups = IstModelDisplayHelpers.defaultDisplayGroups.slice(0);
    
    if(modelConfig.defaultDisplayGroups) {
      groups = modelConfig.defaultDisplayGroups.slice(0);
    } else if (IstModelDisplayHelpers.alwaysHiddenFields.indexOf(attrName) > -1){
      groups = [];// default to no groups so it doesn't show up.
    }
    
    // Add any to include
    if(modelConfig.defaultDisplayGroupsInclude) {
      groups = groups.concat(modelConfig.defaultDisplayGroupsInclude);
    }
    
    // Remove any to exclude
    if(modelConfig.defaultDisplayGroupsExclude) {
      modelConfig.defaultDisplayGroupsExclude.forEach(function (e) {
        if (groups.indexOf(e) > -1) {
          groups.splice(groups.indexOf(e), 1);
        }
      });
    }

    // Now pull the groups out of the specific attr settings
    // If user set displayGroup = 'foo' then override all other settings.
    if (attrConfig.displayGroup !== undefined){ // if it's a string.
      groups = [attrConfig.displayGroup];
    }
    
    // Allow passing an array too.
    if (attrConfig.displayGroups !== undefined){
      groups = attrConfig.displayGroups;
    }
    
    // Merge in any groups to include
    if (attrConfig.displayGroupsInclude !== undefined){
      groups = groups.concat(attrConfig.displayGroupsInclude);
    }
    
    // Remove any needed to exclude
    if (attrConfig.displayGroupsExclude !== undefined){
      attrConfig.displayGroupsExclude.forEach(function (e) {
        if (groups.indexOf(e) > -1) {
          groups.splice(groups.indexOf(e), 1);
        }
      });
    }
    
    allDisplayGroupNames = allDisplayGroupNames.concat(groups);
    newModel[attrName + "DisplayGroups"] = groups;
    
    // Add formatting helper - ie, fooFormatted
    // Adds the passed in formatting function.
    // Default is to just to return the value.
    if (attrConfig.formatter !== undefined) {
      // Set the formatter so we can get it later.
      // Then in the `fooFormatted` function, pass the value to the formatter.
      newModel[attrName + "Formatter"] = attrConfig.formatter;
      
      newModel[attrName + "Formatted"] = Ember.computed(attrName, new Function(
        "return this." + attrName + "Formatter( this.get('"+attrName+"'), this.get('"+attrName+"Unit') ) "
      ));
      
    } else {
      // just return the value
      newModel[attrName + "Formatted"] = Ember.computed(attrName, new Function(
        "return this.defaultFormatter(this.get('"+attrName+"'), this.get('"+attrName+"Unit') ) "
      ));
    }
    
  }// end foreach attr in modelConfig
  
  // Add a ____DisplayAttributes property for each display group.
  allDisplayGroupNames = Ember.A(allDisplayGroupNames).uniq();
  for(var i = 0; i < allDisplayGroupNames.length; i++){
    var displayGroup = allDisplayGroupNames[i];
    newModel[displayGroup + "DisplayAttributes"] = Ember.computed('definedAttributes.@each', new Function(
      "return this.attributeDescriptorsForDisplayGroup('"+displayGroup+"') "
    ));
  }// end for loop
  
  return newModel;
}// end export function


IstModelDisplayHelpers.defaultDisplayGroups = [
  'default'
];

IstModelDisplayHelpers.alwaysHiddenFields = [
  // Don't ever show the IstModelDecorator proxy attributes
  'proxyCache',
  'proxyKind',
  'proxyId'
];

// Strings who have unusual casing. Use lowercase as key.
IstModelDisplayHelpers.specialStringTitles = {
  'guid':  'GUID',
  'id':    'ID',
  'hdd':   "HDD",
  'ssd':   'SSD',
  'ram':   "RAM",
  'tb':    'TB',
  'tib':   'TiB',
  'gb':    'GB',
  'per':   'per',
  'of':    'of',
  'with':  'with',
  'ui':    'UI',
};

// Takes a camel case attr name and adds spaces and capitalizes each word.
export function attrToTitle(attrName){
  return Ember.String.dasherize(attrName).replace(/-/g, ' ').replace(/\w+/g, function(c){
    // Look in our special strings, otherwize just upcase the first letter.
    return (IstModelDisplayHelpers.specialStringTitles[c.toLowerCase()] || Ember.String.capitalize(c.toLowerCase())  );
  });
}

export default IstModelDisplayHelpers;
