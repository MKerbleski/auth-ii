const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const bcrypt = require('bcryptjs');

const db = require('../db/dbConfig')

const secret = "1234";

function generateToken(user){
    const payload = {
        username: user.username,
        department: user.department
    }
    const options = {
        expiresIn: '1d', 
        jwtid: '12345'
    }
    return jwt.sign(payload, secret, options);
}

function protect(req, res, next){
    //this makes sure that there is a valid token that provides identity and passes that info, excluding the password
    const token = req.headers.authorization
    if (token) {
        jwt.verify(token, secret, (err, decodedToken) => {
            if (err) {
                res.status(200).json({message: "error in middleware", err: err})
            } else {
                req.user = {
                    username: decodedToken.username,
                    department: decodedToken.department
                }
                next();
            }
        })
    } else {
        res.status(401).json({message: 'no token! you need a token!'})
    }
}

router.post('/register', (req, res) => {
    const newUser = req.body; 
    const hash = bcrypt.hashSync(newUser.password, 3);
    newUser.password = hash;
    
    db('users')
        .insert(newUser)
        .then(ids => {
            const id = ids[0]
            db('users')
                .where({id})
                .first()
                .then(user => {
                   const token = generateToken(user)
                   res.status(201).json({id: user.id, token})
                }).catch(err => console.log(err))

        }).catch(err => {
            res.status(500).send(err)
        })
})

router.post('/login',  (req, res) => {
    //check with bcrypt if req matches the password 
    const request = req.body
    db('users')
        .where({username: request.username})
        .first()
        .then(dbUser => {
            if (dbUser && bcrypt.compareSync(request.password, dbUser.password)){
               const token = generateToken(dbUser)
                res.status(200).json({message: 'you are now logged in', token})
            } else {
                res.status(401).send('no passing for you!')
            }
        })
})

router.get('/users', protect,  (req, res) => {
    const roles = ['admin', 'Executive', null]
    //null because I don't have an input field yet in registration
    if(roles.includes(req.user.department)){
        db('users')
        .then(users => {
            res.status(200).json({users})
        })
    } else {
        res.status(400).json({message: 'you do not have the necessary permissions to access this data.'})
    }
})

module.exports = router;