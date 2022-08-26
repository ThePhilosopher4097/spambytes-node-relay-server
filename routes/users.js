var express = require('express');
var router = express.Router();
const { Fido2Lib } = require("fido2-lib");

const Logger = require('logger-nodejs');
const log = new Logger();

const { encode, decode } = require('base64-arraybuffer');
const { User, handleError } = require('../utils');
const { default: mongoose } = require('mongoose');
const DeviceDetector = require('device-detector-js');
const { generateToken } = require('node-mongoose-auth/auth');
const { protected_axios, getApiPath } = require('../../spam-bytes-frontend/src/utils');

const deviceDetector = new DeviceDetector();

const optionGeneratorFn = (extName, type, value) => value;
const resultParserFn = () => { };
const resultValidatorFn = () => { };
Fido2Lib.addExtension("appid", optionGeneratorFn, resultParserFn, resultValidatorFn);
// Fido2Lib.addExtension("hmacCreateSecret", optionGeneratorFn, resultParserFn, resultValidatorFn);
Fido2Lib.addExtension("hmac-secret", optionGeneratorFn, resultParserFn, resultValidatorFn);
Fido2Lib.addExtension("largeBlob", optionGeneratorFn, resultParserFn, resultValidatorFn);


const challengeTimeoutSeconds = 60;


const f2l_data = {
  timeout: challengeTimeoutSeconds * 1000,
	rpId: "localhost",
  rpName: "localhost",
  // rpIcon: "https://example.com/logo.png",
  challengeSize: 64,
  attestation: "none",
  cryptoParams: [-7, -37, -257],
  authenticatorRequireResidentKey: false,
  authenticatorUserVerification: "required"
};

router.post('/FIDO/register/challenge/fetch', async (req, res, next) => {

  const data = req.body;

  let curr_user;

  try {
    // const existing_user = await User.findOne({email : data.user_data.email});

    // if(existing_user && existing_user.singleFido) throw "Email is already taken, please try creating your account using a different username.";

    // console.log("User registration personal info : ", data.user_data); // LOG

    // Create User from personal information.
    let create_user = await User.findOne({email : data.user_data.email});

    if(!create_user) create_user = await User.create(data.user_data);

    const user_id = create_user._id;
    
    curr_user = user_id;
    
    // Initiate f2l.
    const f2l = await new Fido2Lib({...f2l_data, authenticatorAttachment : req.body.fido_method});
    
    const registrationOptions = await f2l.attestationOptions();

    // Set user in registration options.
    registrationOptions.user = {
      id : encode(Buffer.from(user_id)),
      displayName : `${data.user_data.first_name} ${data.user_data.last_name}`,
      name : data.user_data.email
    }

    
    registrationOptions.challenge = encode(registrationOptions.challenge);

    const create_pending_challenge = await pendingChallengeResponse.create({user_id, challenge : registrationOptions.challenge});

    if(!create_pending_challenge) throw "Could not create pending challenge instance";

    // console.log("Registration Options in fetch call : ", registrationOptions); // LOG

    // if(curr_user){
    //   const removed_user = await User.deleteOne({_id : curr_user});
    //   console.log("Remove user result : ", removed_user)
    // }
    
    return res.json(registrationOptions);

  } catch (error) {

    console.log(error)
    
    if(curr_user){
      const removed_user = await User.deleteOne({_id : curr_user});
      const removed_pending_challenge = await pendingChallengeResponse.deleteOne({user_id : curr_user});
      console.log("Remove user result : ", removed_user)
      console.log("Remove pending challenge : ", removed_pending_challenge)
    }
    

    return handleError(res, error);
  }
})

router.post("/FIDO/register/challenge/auth", async (req, res, next) => {

  let curr_user;
  
  try {

    const data = req.body;

    const expected_user = await User.findOne({email : data.email});

    if(!expected_user) throw "Your previous account details could not be found, please try creating your account again from scratch."
    curr_user = expected_user._id;
    const expected_challenge = await pendingChallengeResponse.findOne({user_id : expected_user._id});
    // console.log(expected_challenge);
    if(!expected_challenge) throw "FIDO Authentication challenge timed out, please try again.";

    const delete_expired_challenge = await pendingChallengeResponse.deleteOne({user_id : expected_user._id});

    const attestationExpectations = {
      challenge: expected_challenge.challenge,
      origin: process.env.CLIENT_WEB_APP_ORIGIN,
      factor: "either",
    };

    // attestationExpectations.challenge = encode(attestationExpectations.challenge);
    const f2l = await new Fido2Lib(f2l_data);

    // console.log("RECEIVED CHALLENGE : ", decode(data.challenge));

    data.rawId = decode(data.rawId);
    // data.id = data.rawId;
    data.response.clientDataJSON = decode(data.response.clientDataJSON);
    data.response.attestationObject = decode(data.response.attestationObject);

    // console.log("client response :", data);

    const registrationResult = await f2l.attestationResult(data, attestationExpectations);
    console.log(registrationResult);
    const credentialPublicKeyPem = registrationResult.authnrData.get("credentialPublicKeyPem");
    
    const update_user = await User.updateOne({_id : expected_user._id}, {singleFido : credentialPublicKeyPem, userHandle : data.userHandle});

    if(!update_user) throw "Could not update your account with verified FIDO2 device signature."

    console.log(registrationResult);
    return res.json(registrationResult);

  } catch (error) {
    console.log(error);
    
    if(curr_user){
      const removed_user = await User.deleteOne({_id : curr_user});
      console.log("Remove user result : ", removed_user)
    }

    return handleError(res, error);
  }
})

router.post('/FIDO/login/challenge/fetch', async (req, res, next) => {

  const data = req.body;
  
  const email = data.email;

  let curr_user;

  try {
    // const existing_user = await User.findOne({email : data.user_data.email});

    // if(existing_user && existing_user.singleFido) throw "Email is already taken, please try creating your account using a different username.";

    const user = await User.findOne({email});
    if(!user) throw "Could not find your account for the entered Email."
    const user_id = user._id;
    
    curr_user = user_id;  
    
    // Initiate f2l.
    const f2l = await new Fido2Lib({...f2l_data});
    f2l.enableExtension("appid");
    
    const authOptions = await f2l.assertionOptions({
      extensionOptions: {
        appid: "https://localhost", // notice lowercase i in appid
      }
    });
    // const authOptions = await f2l.assertionOptions();

    console.log(authOptions)

    authOptions.challenge = encode(authOptions.challenge);
    // authOptions.allowCredentials = [
    //   {
    //     id : "lTqW8H/lHJ4yT0nLOvsvKgcyJCeO8LdUjG5vkXpgO2b0XfyjLMejRvW5oslZtA4B/GgkO/qhTgoBWSlDqCng4Q==",
    //     type : "public-key"
    //   }
    // ]

    const create_pending_challenge = await pendingChallengeResponse.updateOne({user_id},{challenge : authOptions.challenge}, {upsert : true} );

    if(!create_pending_challenge) throw "Could not create pending challenge instance";

    // console.log("Registration Options in fetch call : ", registrationOptions); // LOG
    
    return res.json(authOptions);

  } catch (error) {
    console.log(error)
    const removed_pending_challenge = await pendingChallengeResponse.deleteOne({user_id : curr_user});
    return handleError(res, error);
  }
})

router.post("/FIDO/login/challenge/auth", async (req, res, next) => {

  let curr_user;
  
  try {

    const data = req.body;

    const expected_user = await User.findOne({email : data.email});

    if(!expected_user) throw "Your account details could not be found, please try again from scratch."
    curr_user = expected_user._id;

    console.log(expected_user)

    // console.log(expected_user);

    const expected_challenge = await pendingChallengeResponse.findOne({user_id : expected_user._id});
    // console.log(expected_challenge);
    if(!expected_challenge) throw "FIDO Authentication challenge timed out, please try again.";

    const delete_expired_challenge = await pendingChallengeResponse.deleteOne({user_id : expected_user._id});

    const assertionExpectations = {
      challenge: expected_challenge.challenge,
      origin: process.env.CLIENT_WEB_APP_ORIGIN,
      factor: "either",
      publicKey: expected_user.singleFido,
      prevCounter : 0,
      userHandle : expected_user.userHandle
    };

    // attestationExpectations.challenge = encode(attestationExpectations.challenge);
    const f2l = await new Fido2Lib(f2l_data);

    // console.log("RECEIVED CHALLENGE : ", decode(data.challenge));

    data.id = decode(data.id);

    data.authenticatorData = decode(data.response.authenticatorData);
    data.clientDataJSON = decode(data.response.clientDataJSON);
    data.signature = decode(data.response.signature);
    data.userHandle = decode(data.response.userHandle);
    // console.log("client response :", data);

    // return res.json({"success" : true})
    
    const authenticationResult = await f2l.assertionResult(data, assertionExpectations);

    const auth_token = await generateToken(expected_user);

    return res.json({
      auth_token,
      user : expected_user
    });


  } catch (error) {
    console.log(error);

    return handleError(res, error);
  }
})




router.post('/FIDO/challenge/pending/prune', async (req, res, next) => {
  const data = req.body;


  try {

    const user = await User.findOne({email : data.email})

    const pruned = await pendingChallengeResponse.deleteOne({user_id : user._id});

    return res.json(pruned);
  } catch (error) {
    return handleError(res, error);
  }
  
})

const pendingChallengeResponseSchema = {
  user_id : String,
  challenge : String,
  createdAt : {
    type : Date,
    expires : challengeTimeoutSeconds
  }
}

const pendingChallengeResponse = mongoose.model("Pending Challenge response", pendingChallengeResponseSchema);


module.exports = router;
