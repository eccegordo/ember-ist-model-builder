import Ember from "ember";
const {isEmpty, isBlank, computed, A} = Ember;
const {dasherize, capitalize} = Ember.String;
const {inflector} = Ember.Inflector;


export function roundNumber(number, decimals) {
  if (isEmpty(number)){
    return null;
  }
  number = number.valueOf();// make sure it's the real number.
  if(Math.round(number) === number || decimals === 0){
    number = Math.round(number);
  }else{
    number = Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
  return number;
}


// tries to use i18n large numbers unless it's Safari it just uses english style.
export function prettyNumber(number, decimals) {
  if (isEmpty(number)){
    return null;
  }
  number = number.valueOf();// make sure it's the real number.
  if (decimals === undefined){decimals = 2;}
  // Never round to zero, give at least once decimal
  if (number > -1 && number < 1 && number !== 0.0){
    if (number.toLocaleString){
      return number.toLocaleString(); // This is kinda slow new window.Intl.NumberFormat(window.locale, {maximumSignificantDigits: 2}).format(number);
    } else {
      // We'll do it ourselves.
      var rawNumber = number;
      do {
        number = roundNumber(rawNumber, decimals);
        decimals = decimals + 1;
      } while(number === 0 || number === 0.0);

      return number + '';
    }
  } else {
    number = roundNumber(number, decimals);
  }

  if (number.toLocaleString){
    return number.toLocaleString();
  }else{
    return number + '';
  }

}

// Use decimals for the percentage. IE, 50% = 0.5
// tries to use i18n percent unless it's Safari it just uses english style.
export function prettyPercent(number, decimals) {
  if (isEmpty(number)){
    return null;
  }
  number = number.valueOf();// make sure it's the real number.
  if (decimals === undefined){decimals = 0;}
  if (!!window.Intl && window.locale){
    return new window.Intl.NumberFormat(window.locale, {style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(number);
  } else {
    number = number * 100;
    number = roundNumber(number, decimals);
    return number + '%';
  }
}

// Takes a camel case attr name and adds spaces and capitalizes each word.
export function attrToTitle(attrName){
  return dasherize(attrName).replace(/-/g, ' ').replace(/\w+/g, function(c){
    // Look in our special strings, otherwize just upcase the first letter.
    return (IstModelDisplayHelpers.specialStringTitles[c.toLowerCase()] || capitalize(c.toLowerCase())  );
  });
}


// Takes the defaults for the app, merges with the defaults for the
// model, and merges that with the specific attr config
export function displayGroupsForAttrFromConfig(modelConfig, attrName){
  var attrConfig = (modelConfig.attributes || {})[attrName];

  // Build the array of display groups. Dupe the array so it doesn't mutate original
  var groups = IstModelDisplayHelpers.defaultDisplayGroups.slice(0);

  if(modelConfig.defaultDisplayGroups) {
    groups = modelConfig.defaultDisplayGroups.slice(0);
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

  // Always enfoce alwaysHiddenFields so they don't show up... Unless specificly set by attrConfig.displayGroup
  if (IstModelDisplayHelpers.alwaysHiddenFields.indexOf(attrName) > -1){
    groups = [];
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

  return groups;
}// end displayGroupsForAttrFromConfig


function IstModelDisplayHelpers(modelConfig) {
  var newModel = {
    // This is a pretty version of the model name.
    typeTitle: computed(function(){
      var title = this.get('modelConfig').typeTitle;
      if (title === undefined) {
        title = capitalize(dasherize(this.constructor.typeKey.toString()).replace(/\-/g, ' '));
      }
      return title;
    }),

    // Use for a listing of models
    typeTitlePlural: computed('typeTitle', function(){
      return inflector.pluralize(this.get('typeTitle'));
    }),

    // Default title will be the type title plus name or title attribute, if defined.
    displayTitle: computed('typeTitle', 'name', 'title', function () {
      var name = this.get('name');
      var title = this.get('title');
      var typeTitle = this.get('typeTitle');

      if (!isBlank(name)){
        return typeTitle + ': ' + name;
      } else if (!isBlank(title)){
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
          if (typeof self.get(attrName + 'DisplayGroups') === 'object' && self.get(attrName + 'DisplayGroups').indexOf(group) != -1) {
            results.push(attrName);
          }
        });
      });

      // Remove any that are nil if requested
      results = results.filter(function (attr) {
        try {
          var attrConfig = self.modelConfig.attributes[attr];
          var value = self.get(attr);

          if (self.modelConfig.decoratorModel && attrConfig === undefined) {
            var proxyModelConfig = self.get('content').modelConfig;
            if (proxyModelConfig && proxyModelConfig.attributes){
              attrConfig = proxyModelConfig.attributes[attr];
            } else {
              attrConfig = {};
            }
          }

          if(attrConfig.hideIfBlank && isBlank(value) ||
             (attrConfig.hideIfBlank && value.valueOf && isBlank(value.valueOf() ))
            ){
            return false;
          } else {
            return true;
          }
        }catch(e){
          console.error(e); // eslint-disable-line no-console
          return true;
        }
      });

      return results;
    },

    displayGroupsForAttr: function(attrName){
      return displayGroupsForAttrFromConfig(this.modelConfig, attrName);
    },

    // Returns a new object for each attribute in a display group
    // that will have a standard interface for getting title, formatted, unit, etc.
    attributeDescriptorsForDisplayGroup: function (displayGroup) {
      var self  = this;
      var attrs = this.attributeNamesForDisplayGroup(displayGroup);
      var out   = attrs.map(function (attrName) {
        var attrObj = Ember.Object.extend({
          title:          computed.alias('model.' + attrName + 'Title'),
          value:          computed.alias('model.' + attrName),
          valueFormatted: computed.alias('model.' + attrName + 'Formatted'),
          displayGroups:  computed.alias('model.' + attrName + 'DisplayGroups'),
          unit:           computed.alias('model.' + attrName + 'Unit'),
        }).create({
          attrName: attrName,
          model:    self,
        });
        attrObj.toString = function(){
          return this.get('attrName');
        };
        return attrObj;
      });
      return A(out);
    },

    // Round floats, otherwise return value with unit attached
    defaultFormatter: function(value, unit){
      var formatted = '';
      if (value === null || value === undefined) {
        return formatted;
      }
      if (value.valueOf){value = value.valueOf();}
      if (typeof value === "number") {
        formatted = this.prettyNumber(value);
      } else {
        if (isEmpty(value)){
          formatted = ''; // guard against the case of undefined/null values
        } else {
          formatted = value.toString();
        }
      }

      if (unit !== undefined) {
        formatted = formatted + " " + unit;
      }
      return formatted;
    },

    roundNumber: roundNumber,
    prettyPercent: prettyPercent,
    prettyNumber: prettyNumber,

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

    var groups = displayGroupsForAttrFromConfig(modelConfig, attrName);
    allDisplayGroupNames = allDisplayGroupNames.concat(groups);
    newModel[attrName + "DisplayGroups"] = computed(attrName, new Function(
      "return this.displayGroupsForAttr('"+attrName+"');"
    ));

    // Add formatting helper - ie, fooFormatted
    // Adds the passed in formatting function.
    // Default is to just to return the value.
    if (attrConfig.formatter !== undefined) {
      // Set the formatter so we can get it later.
      // Then in the `fooFormatted` function, pass the value to the formatter.
      newModel[attrName + "Formatter"] = attrConfig.formatter;

      newModel[attrName + "Formatted"] = computed(attrName, new Function(
        "return this." + attrName + "Formatter( this.get('"+attrName+"'), this.get('"+attrName+"Unit') ) "
      ));

    } else {
      // just return the value
      newModel[attrName + "Formatted"] = computed(attrName, new Function(
        "return this.defaultFormatter(this.get('"+attrName+"'), this.get('"+attrName+"Unit') ) "
      ));
    }

  }// end foreach attr in modelConfig

  // Add a ____DisplayAttributes property for each display group.
  allDisplayGroupNames = A(allDisplayGroupNames).uniq();
  for(var i = 0; i < allDisplayGroupNames.length; i++){
    var displayGroup = allDisplayGroupNames[i];
    newModel[displayGroup + "DisplayAttributes"] = computed('definedAttributes.[]', new Function(
      "return this.attributeDescriptorsForDisplayGroup('"+displayGroup+"') "
    )).volatile();
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




export default IstModelDisplayHelpers;
