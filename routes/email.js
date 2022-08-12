var express = require('express');
const mongoose = require('mongoose');
const UserSchema = require('node-mongoose-auth/models/UserSchema');
const Email = require('../Schema/EmailSchema');
const { handleError } = require('../utils');
var router = express.Router();



const User = mongoose.model("User", UserSchema);

/* GET users listing. */
router.post('/check', async function(req, res, next) {

  if(!req.body.email) handleError("No Email given.");
  
  console.log(req.body.email);

  try {
    const user = await User.findOne({email : req.body.email});

    return res.json({message : user ? "true" : "false"});
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
