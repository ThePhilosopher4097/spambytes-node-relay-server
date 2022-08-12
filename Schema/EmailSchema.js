const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EmailSchema = new Schema({}, { strict: false });
const Email = mongoose.model('emails', EmailSchema,);

module.exports = Email;