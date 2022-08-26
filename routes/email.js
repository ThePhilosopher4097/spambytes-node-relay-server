var express = require('express');
const { default: mongoose } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Email = require('../Schema/EmailSchema');
const { handleError, User } = require('../utils');
const nodemailer = require("nodemailer");
var router = express.Router();

const crypto = require("crypto")
var eccrypto = require("eccrypto");


const category_schema = new mongoose.Schema({ type : mongoose.Schema.Types.Mixed }, {strict : false, _id : false});
const known_recipents_schema = new mongoose.Schema({ type : mongoose.Schema.Types.Mixed }, {strict : false, _id : false});

const KnownRecipents = mongoose.model("known recipent", known_recipents_schema);
category_schema.plugin(mongoosePaginate);


let mailer_config_options = {
  host : "spambytes.tech",
  port : 25,
  secure : false,
  tls: {
    rejectUnauthorized: false
  }

}



/* GET users listing. */
router.post('/check', async function(req, res, next) {

  if(!req.body.email) handleError("No Email given.");
  

  try {
    const user = await User.findOne({email : req.body.email});

    return res.json({message : user ? "true" : "false"});
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/fetch', async (req, res, next) => {

  const data = req.body;
  
  try {
    
    const user = await User.findOne({_id : data.user_id});

    if(!user) throw "Your account could not be found.";

    if(!['inbox', 'malicious', 'sent', 'starred'].includes(data.category)) throw "Invalid category entered";

    const EmailCategory = mongoose.model(`${data.category} mails`, category_schema);

    

    let query = {
      rcpt_to : user.email
      
    };

    if(data.search_param){
      query = {
        rcpt_to : user.email,
        $or : [
          {
            email : {
              $regex : data.search_param,
              $options : "i"
            }
          },
          {
            "headers.subject" : {
              $regex : data.search_param,
              $options : "i"
            }
          },
        ]
      }
    }

    let options = {
      // select: '_id mail_from rcpt_to body headers',
      lean: true,
      limit: data.limit || 10,

    };

    const result = await EmailCategory.paginate(query, options);

    // console.log(result);

    return res.json(result);

  } catch (error) {
    console.log(error);
    return handleError(res, error);
  }
})

router.post('/send', async (req, res, next) => {
  const data = req.body;
  console.log(data)

  try {
    
    let transporter = nodemailer.createTransport(mailer_config_options)

    let info = await transporter.sendMail({
      from : data.from,
      to : data.to,
      subject : data.subject,
      text : data.text,
      html : data.html
    })

    console.log(info)



    await KnownRecipents.updateOne(
      {email : data.from},
      {$addToSet : { recipents : data.to }},
      {upsert : true}
    )

    return res.json(info);

  } catch (error) {
    console.log(error);
    return handleError(res, error);
  }
})

router.post("/to/suggestions", async (req, res, next) => {
  try {
    const data = req.body;

    if(!data.email) throw "Missing email.";
    
    const regexp = new RegExp("^"+ data.param);
  
    const known_recipents = await KnownRecipents.findOne({email : data.email, recipents : regexp}).limit(10);

    // console.log(known_recipents);

    return res.json(known_recipents);


  } catch (error) {
    console.log(error);
    handleError(res, error);
  }

})

router.post("/move", async (req, res, next) => {
  try {
    const data = req.body;

    if(!['inbox', 'malicious', 'sent', 'starred'].includes(data.from)) throw "Invalid category entered";

    const EmailCategory1 = mongoose.model(`${data.from} mails`, category_schema);

    console.log(data)

    const curr_mail = await EmailCategory1.findOne({_id : data.email_id});
    console.log(curr_mail)
    const EmailCategory2 = mongoose.model(`${data.to} mails`, category_schema);

    const new_mail = await EmailCategory2.create(curr_mail);
    
    await EmailCategory1.findOne({_id : data.email_id}).remove();
    
    return res.json({});

  } catch (error) {
    console.log(error);
    return handleError(res, error);
    
  }
})


var FlaggedSchema = new mongoose.Schema(
  {
      type : mongoose.Schema.Types.Mixed,
  },
  {
      strict : false,
      _id : false
  }
)

var Flagged = mongoose.model("Flagged address", FlaggedSchema);

router.post("/flag", async (req, res) => {
  try {
    const data = req.body;

    const email = data.email;
    
    const flag_user = await Flagged.updateOne(
      {
        email
      },
      {
        $inc : {
          count : 1
        }
      },
      {
        upsert : true
      }
    );

    return res.json(flag_user);

  } catch (error) {
    return handleError(res, error);
  }
})

router.post("/delete", async (req, res) => {
  try {
    const data = req.body;

    const EmailCategory = mongoose.model(`${data.category} mails`, category_schema);

    const result = await EmailCategory.remove({_id : data.email_id});

    return res.json(result);
    
  } catch (error) {
    console.log(error)
    return handleError(res, error);
  }
})

router.post("/test", async (req, res, next) => {
  const data = req.body;

  

  const str = "testing this string here";

  // let { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
  //   // The standard secure default length for RSA keys is 2048 bits
  //   modulusLength: 2048,
  // });

  const user = await User.findOne({_id : data.user_id}).select("singleFido");

  const pub = eccrypto.getPublic(user.singleFido);

  console.log(pub);

  
  eccrypto.sign(pub, Buffer.from("testing")).then(enc => {
    console.log(enc);
  })
  
  return res.json({})
  return res.json({cipher : enc.toString("base64")})

})



module.exports = router;
