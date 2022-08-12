var express = require('express');
var router = express.Router();
const { Fido2Lib } = require("fido2-lib");

const Logger = require('logger-nodejs');
const log = new Logger();


const challengeArray = Array.from({length: 32}, () => Math.floor(Math.random() * 40));

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/FIDO/register/challenge/fetch', async(req, res, next) => {
  
  const user_id = req.body.user_id;

  const f2l = new Fido2Lib({
    timeout: 100000,
    rpId: "caa8-43-227-20-34.in.ngrok.io",
    rpName: "Local",
    // rpIcon: "https://example.com/logo.png",
    challenge : challengeArray,
    challengeSize: 128,
    attestation: "none",
    cryptoParams: [-7, -257],
    authenticatorAttachment: "platform",
    authenticatorRequireResidentKey: false,
    authenticatorUserVerification: "required"
  });
  
  const registrationOptions = await f2l.attestationOptions();

  registrationOptions.user = {
      id : user_id,
      displayName : "Hrushikesh Chapke",
      name : "fishi@spambytes.tech"
    }
  registrationOptions.pubKeyCredParams = [
    {
      "type": "public-key",
      "alg": -7
    },
    {
      "type": "public-key",
      "alg": -8
    },
    {
      "type": "public-key",
      "alg": -36
    },
    {
      "type": "public-key",
      "alg": -37
    },
    {
      "type": "public-key",
      "alg": -38
    },
    {
      "type": "public-key",
      "alg": -39
    },
    {
      "type": "public-key",
      "alg": -257
    },
    {
      "type": "public-key",
      "alg": -258
    },
    {
      "type": "public-key",
      "alg": -259
  }];
  registrationOptions.challengeArray = challengeArray;


  // console.log("registrationOptions", registrationOptions)

  return res.json(registrationOptions);
})

module.exports = router;
