import Ember from 'ember';
import ChainedProxyMixin from 'dummy/lib/chained-proxy-mixin';

export default Ember.Route.extend({
  model: function () {
    var school = this.store.createRecord('school');
    var student = this.store.createRecord('student', {
      school: school,
      name: 'Alicia',
      notes: 'Very good kid',
      age: 5
    });
    
    school.get('students').pushObject(student);

    var decorated = this.store.createRecord('friend');
    Ember.run.later(function () {
      decorated.set('proxyTo', student);      
    }, 1000);
    
    
    var chain = Ember.Object.extend(ChainedProxyMixin).create({
      contents: Ember.A([
        Ember.Object.create({
          name: "Don",
        }),
        
      ])
    });

    var secondChainItem = Ember.Object.create({
      age: 66,
      school: Ember.Object.create({name: 'Foo Heights'}),
      schoolName: Ember.computed.alias("school.name")
    });

    // Delay setting so we can make sure the push binding works
    Ember.run.later(function () {
      chain.get('contents').pushObject(secondChainItem);
    }, 2000);
    
    
    
    var fieldsToEdit = student.get('editableFields');
    fieldsToEdit.objectAt(0).applyCustomSettings({
      label: "Student's Name: " 
    });
    
    return {
      student: student,
      school:  school,
      decorated:  decorated,
      chain: chain,
      
      fieldsToEdit: fieldsToEdit,

      secondChainItem: secondChainItem,
      
    };
  }
  
  
});
