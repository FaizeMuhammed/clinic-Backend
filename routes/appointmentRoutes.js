const express = require('express');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctors');
const router = express.Router();
const authMiddleware = require('../middleware/authmiddleware');

// Book an appointment
router.post('/', async (req, res) => {
  try {
    const { doctorId, date, time, patientName, phone, location, referredBy, type } = req.body;

    if (!['New Patient', 'Revisit', 'Follow-up'].includes(type)) {
      return res.status(400).json({ message: 'Invalid appointment type' });
    }

    let patient = await Patient.findOne({ phone });
    if (!patient) {
      patient = new Patient({ name: patientName, phone, location, referredBy });
      await patient.save();
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Check if the time slot is available
    const bookedAppointments = await Appointment.countDocuments({ doctorId, date, time });
    if (bookedAppointments >= doctor.appointmentsPerHour) {
      return res.status(400).json({ message: 'Time slot fully booked' });
    }

    const appointment = new Appointment({
      doctorId,
      patientId: patient._id, // Store patient reference
      date,
      time,
      type, // Store the type of appointment
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all appointments with patient details
router.get('/', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('doctorId', 'name specialty')
      .populate('patientId', 'name phone location');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    
      const { id } = req.params; // Extract appointment ID from URL
      const { status } = req.body; // Extract new status from request body

      // Find the appointment by ID and update the status
      const updatedAppointment = await Appointment.findByIdAndUpdate(
          id,
          { status },
          { new: true } // Return the updated document
      );

      if (!updatedAppointment) {
          return res.status(404).json({ error: 'Appointment not found' });
      }

      res.status(200).json({ message: 'Appointment status updated successfully', appointment: updatedAppointment });
  } catch (error) {
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});
router.get('/doctor/:doctorId/patients', async (req, res) => {
    try {
      const { doctorId } = req.params;
      
      // Get unique patient IDs for the doctor
      const totalPatients = await Appointment.distinct('patientId', { doctorId });
  
      res.json({ totalPatients: totalPatients.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/doctor/:doctorId/appointments/:date', async (req, res) => {
    try {
      const { doctorId, date } = req.params;
  
      // Get all appointments for the doctor on the given date
      const appointments = await Appointment.find({ doctorId, date }).populate('patientId');
  
      let newPatients = 0;
      let revisitPatients = 0;
  
      for (const appointment of appointments) {
        const firstVisit = await Appointment.findOne({ patientId: appointment.patientId._id })
          .sort({ date: 1 }) // Get the earliest appointment
          .select('date');
  
        if (firstVisit.date === date) {
          newPatients++; // First time visiting
        } else {
          revisitPatients++; // Patient has previous visits
        }
      }
  
      res.json({ totalAppointments: appointments.length, newPatients, revisitPatients });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.get('/doctor/:doctorId/report', async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { type, value } = req.query; // type = day, month, year | value = YYYY-MM-DD, YYYY-MM, YYYY
  
      let matchCondition = { doctorId };
  
      if (type === 'day') {
        matchCondition.date = value; // YYYY-MM-DD
      } else if (type === 'month') {
        matchCondition.date = { $regex: `^${value}-` }; // YYYY-MM
      } else if (type === 'year') {
        matchCondition.date = { $regex: `^${value}` }; // YYYY
      }
  
      const appointments = await Appointment.find(matchCondition).populate('patientId');
  
      let newPatients = 0;
      let revisitPatients = 0;
      
      for (const appointment of appointments) {
        const firstVisit = await Appointment.findOne({ patientId: appointment.patientId._id })
          .sort({ date: 1 }) // Get the earliest appointment
          .select('date');
  
        if (firstVisit.date === appointment.date) {
          newPatients++;
        } else {
          revisitPatients++;
        }
      }
  
      res.json({ totalAppointments: appointments.length, newPatients, revisitPatients });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
    

  // Get appointments by date
router.get("/date/:date", async (req, res) => {
  try {
      const { date } = req.params;

      // Find appointments for the given date
      const appointments = await Appointment.find({ date })
          .populate("doctorId", "name specialty")
          .populate("patientId", "name phone location referredBy");

      if (!appointments.length) {
          return res.status(404).json({ message: "No appointments found for this date." });
      }

      res.json({
          date,
          totalAppointments: appointments.length,
          appointments: appointments.map(app => ({
              _id: app._id,
              doctor: app.doctorId,
              patient: app.patientId,
              timeSlot: app.timeSlot,
              status: app.status
          }))
      });
  } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
