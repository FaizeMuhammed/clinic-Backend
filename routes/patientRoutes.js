const express = require('express');
const Patient = require('../models/Patient');
const router = express.Router();
const authMiddleware = require('../middleware/authmiddleware');

// Add a new patient
router.post('/',authMiddleware, async (req, res) => {
  try {
    const { name, phone, location, referredBy, medicalHistory } = req.body;

    let patient = await Patient.findOne({ phone });
    if (patient){
      console.log('ji');
      
      return res.status(400).json({ message: 'Patient already exists' });}

    patient = new Patient({ name, phone, location, referredBy, medicalHistory });
    await patient.save();
console.log('ddd');

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all patients
router.get('/',authMiddleware,async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single patient by ID
router.get('/:id',authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
