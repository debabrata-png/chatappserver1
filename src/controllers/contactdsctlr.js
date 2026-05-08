const contactds = require('../Models/contactds');

// Create and Save a new contact
exports.createcontact = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;   
        const newContact = new contactds({ name, email, phone, message });
        await newContact.save();
        res.status(201).json(newContact);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
};

// Retrieve all contacts
exports.getallcontacts = async (req, res) => {
    try {
        const contacts = await contactds.find().sort({ createdAt: -1 });
        res.status(200).json(contacts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};