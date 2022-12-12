const express = require('express');
const bodyparser = require("body-parser");
const https = require('https')
const fs = require('fs')
const {v4 : uuidv4} = require("uuid");
const port = 443;
const app = express();
const {createClient} = require('redis');
const md5 = require('md5');
const Max_login = 3;

const redisClient = createClient(
{
    url:`redis://default:${process.env.REDIS_PASS}@redis-stedi-scott:6379`,
}
);

app.use(bodyparser.json());

app.use(express.static("public"))

https.createServer({
    key: fs.readFileSync('./SSL/server.key'),
    cert: fs.readFileSync('./SSL/server.cert'),
    ca: fs.readFileSync('./SSL/chain.pem')
    
}, app).listen(port, async () => {
    try{
        await redisClient.connect();
        console.log('Listening...')}
    catch(error){
        console.log(error)
    }
});

// app.listen(port, async ()=>{
//     await redisClient.connect();
//     console.log('LiStEnInG oN pOrT '+port);
// });

app.get('/', (req,res)=>{
    res.send('Hello World!')
});
app.post('/user', (req,res)=>{
    const newUserRequestObject = req.body;
    console.log('New User:', JSON.stringify(newUserRequestObject));
    const loginPassword = req.body.password;
    const hashPassword = md5(loginPassword);
    // console.log(hashPassword);
    newUserRequestObject.password = hashPassword;
    newUserRequestObject.verifyPassword = hashPassword;
    // console.log('NEW USER:', JSON.stringify(newUserRequestObject))
    redisClient.hSet('users', req.body.email, JSON.stringify(newUserRequestObject));
    res.send('NEW USER ' +newUserRequestObject.email+' ADDED');
});
var login_dictionary = {};

app.post("/login", async (req,res) =>{
    const newUserRequestObject = req.body;
    const loginEmail = req.body.userName;
    console.log (JSON.stringify(req.body));
    console.log("loginEmail", loginEmail);
    const loginPassword = md5(req.body.password);
    console.log("loginPassword", loginPassword);

    const userString=await redisClient.hGet('users',loginEmail);
    const userObject=JSON.parse(userString)
    if(login_dictionary[loginEmail] == null) {login_dictionary[loginEmail] = 0}
    if(login_dictionary[loginEmail] >= Max_login){
        return res.status(469).send("Too many failed attempts")
    }
    if(userString =='' || userString==null){
        res.status(404);
        res.send('User not found');
    }

    else if (loginEmail == userObject.userName && loginPassword == userObject.password){
        const token = uuidv4();
        res.send(token);
    } else{
        login_dictionary[loginEmail] += 1;
        redisClient.hset("users", req.loginEmail,JSON.stringify(userObject));
        res.status(401);//unauthorized
        res.send("Invalid user or password");
    }
});