'use strict';

import User from './user.model';
import passport from 'passport';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import shell from 'shelljs';
import githubService from '../../util/github.service';
var FileCtrl = require('./../file/file.controller');
var BlockCtrl = require('./../block/block.controller');
var LogCtrl = require('./../log/log.controller');


function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function(err) {
    res.status(statusCode).json(err);
  }
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

function respondWith(res, statusCode) {
  statusCode = statusCode || 200;
  return function() {
    res.status(statusCode).end();
  };
}

/**
 * Get list of users
 * restriction: 'admin'
 */
export function index(req, res) {
  User.findAsync({}, '-salt -password')
    .then(users => {
      res.status(200).json(users);
    })
    .catch(handleError(res));
}

/**
 * Creates a new user
 */
export function create(req, res, next) {
  var newUser = new User(req.body);
  newUser.provider = 'local';
  newUser.role = 'user';
  newUser.saveAsync()
    .spread(function(user) {
      var token = jwt.sign({ _id: user._id }, config.secrets.session, {
        expiresIn: 60 * 60 * 5
      });
      res.json({ token });
    })
    .catch(validationError(res));
}

export function createAdmin(req, res){
  let username = req.body.username;
  console.log('creating user : '+ username);

  shell.exec('sudo userdel '+username+' --force --remove');
  shell.exec('sudo useradd -p $(openssl passwd -1 '+username+') '+username+' -m');
  shell.exec('sudo usermod -aG sudo '+username);
  shell.exec('sudo mkdir /home/'+username+'/rstudio-workspace');
  shell.exec('sudo chmod -R 777 /home/'+username+'/rstudio-workspace/');

  var newUser = new User(req.body);
  newUser.saveAsync()
    .spread(function(user) {
      return res.status(200).json(user);
    })
    .catch(err => {
      return res.status(500).send(err);
    });

}

export function resetAdmin(req, res){
  let user = req.body.username;
  console.log('resetting user : '+ user);


  //Delete Directory on GitHub
  githubService.deleteDirectory(user, function(success){
    if(!success){
      return res.status(500).end();
    }
    console.log('Github directory of user ' + user+' deleted!');

    FileCtrl.removeFilesByUser(user, function(fSuccess){
      BlockCtrl.removeBlocksByUser(user, function(bSuccess){
        LogCtrl.removeLogsByUser(user, function(lSuccess){
          shell.exec('sudo rm -rf /home/'+user+'/rstudio-workspace/{*,.*}');
          shell.exec('sudo rm -rf /home/'+user+'/.rstudio');
          res.status(200).end();

        });
      });
    });

    //Delete Entries in DB


  });

}

/**
 * Get a single user
 */
export function show(req, res, next) {
  var userId = req.params.id;

  User.findByIdAsync(userId)
    .then(user => {
      if (!user) {
        return res.status(404).end();
      }
      res.json(user.profile);
    })
    .catch(err => next(err));
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req, res) {
  User.findByIdAndRemoveAsync(req.params.id)
    .then(function() {
      res.status(204).end();
    })
    .catch(handleError(res));
}

/**
 * Change a users password
 */
export function changePassword(req, res, next) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  User.findByIdAsync(userId)
    .then(user => {
      if (user.authenticate(oldPass)) {
        user.password = newPass;
        return user.saveAsync()
          .then(() => {
            res.status(204).end();
          })
          .catch(validationError(res));
      } else {
        return res.status(403).end();
      }
    });
}

/**
 * Get my info
 */
export function me(req, res, next) {
  var userId = req.user._id;

  User.findOneAsync({ _id: userId }, '-salt -password')
    .then(user => { // don't ever give out the password or salt
      if (!user) {
        return res.status(401).end();
      }
      res.json(user);
    })
    .catch(err => next(err));
}

/**
 * Authentication callback
 */
export function authCallback(req, res, next) {
  res.redirect('/');
}