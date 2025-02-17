const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: {
    type: String,
    enum: [
      'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology',
      'Oncology', 'Psychiatry', 'General Medicine','Gynaecology'
    ],
    required: true
  },
  availability: {
    type: Map,
    of: [{ type: String }] 
  },
  appointmentsPerHour: { type: Number, required: true },
  yearsOfExperience: { type: Number, required: true },
  educationCertifications: { type: String, required: true }
});

module.exports = mongoose.model('Doctor', doctorSchema);
