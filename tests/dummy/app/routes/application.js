import Ember from 'ember';

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
    return student;
  }
  
  
});
