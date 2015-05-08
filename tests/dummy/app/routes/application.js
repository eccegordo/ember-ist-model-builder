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
      contents: [
        Ember.Object.create({
          name: "Don",
        }),
        Ember.Object.create({
          age: 66,
          school: Ember.Object.create({name: 'Foo Heights'}),
          schoolName: Ember.computed.alias("school.name")
        }),
      ]
    });
    
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
      
      
    };
  }
  
  
});
