'use strict';

(function() {

function AuthService($location, $http, $cookies, $q, appConfig, Util, User, StorageUtil) {
  var safeCb = Util.safeCb;
  var currentUser = {};
  var userRoles = appConfig.userRoles || [];

  if ($cookies.get('token') && $location.path() !== '/logout') {
    currentUser = User.get();
  }

  var Auth = {

    /**
     * Authenticate user and save token
     *
     * @param  {Object}   user     - login info
     * @param  {Function} callback - optional, function(error, user)
     * @return {Promise}
     */
    login(user, callback) {
      return $http.post('/auth/local', {
        username: user.username,
        password: user.password
      })
        .then(res => {
          $cookies.put('token', res.data.token);
          currentUser = User.get();
          return currentUser.$promise;
        })
        .then(user => {
          safeCb(callback)(null, user);
          return user;
        })
        .catch(err => {
          Auth.logout();
          safeCb(callback)(err.data);
          return $q.reject(err.data);
        });
    },

    /**
     * Delete access token and user info
     */
    logout() {
      $cookies.remove('token');
      currentUser = {};
      StorageUtil.removeSStorage('user');
    },

    /**
     * Manually set current user
     */
    setCurrentUser(user){
      console.log('set current user manual', user);
      currentUser = user;
    },

    /**
     * Create a new user
     *
     * @param  {Object}   user     - user info
     * @param  {Function} callback - optional, function(error, user)
     * @return {Promise}
     */
    createUser(user, callback) {
      return User.save(user,
        function(data) {
          $cookies.put('token', data.token);
          currentUser = User.get();
          return safeCb(callback)(null, user);
        },
        function(err) {
          Auth.logout();
          return safeCb(callback)(err);
        }).$promise;
    },

    /**
     * Create a new user in DB + on server + adds workspace for R-Studio
     *
     * @param  {Object}   user     - user info
     * @param  {Function} callback - optional, function(error, user)
     * @return {Promise}
     */
    createUserAdmin(user, callback) {
      return $http.post('/api/users/createAdmin', user)
        .then(res => {
          return res.$promise;
        })
        .catch(err => {
          return $q.reject(err.data);
        });
    },

    /**
     * Resets existing user and cleans workspace on server
     *
     * @param  {Object}   user     - user info
     * @param  {Function} callback - optional, function(error, user)
     * @return {Promise}
     */
    resetUserAdmin(user, callback) {
      return $http.post('/api/users/resetAdmin', user)
        .then(res => {
          return res.$promise;
        })
        .catch(err => {
          return $q.reject(err.data);
        });
    },

    /**
     * Delets an existing user and cleans workspace on server
     *
     * @param  {Object}   user     - user info
     * @param  {Function} callback - optional, function(error, user)
     * @return {Promise}
     */
    deleteUserAdmin(user, callback) {
      return $http.post('/api/users/deleteAdmin', user)
        .then(res => {
          return res.$promise;
        })
        .catch(err => {
          return $q.reject(err.data);
        });
    },

    /**
     * Change password
     *
     * @param  {String}   oldPassword
     * @param  {String}   newPassword
     * @param  {Function} callback    - optional, function(error, user)
     * @return {Promise}
     */
    changePassword(oldPassword, newPassword, callback) {
      return User.changePassword({ id: currentUser._id }, {
        oldPassword: oldPassword,
        newPassword: newPassword
      }, function() {
        return safeCb(callback)(null);
      }, function(err) {
        return safeCb(callback)(err);
      }).$promise;
    },

    /**
     * Gets all available info on a user
     *   (synchronous|asynchronous)
     *
     * @param  {Function|*} callback - optional, funciton(user)
     * @return {Object|Promise}
     */
    getCurrentUser(callback) {
      if (arguments.length === 0) {
        return currentUser;
      }

      var value = (currentUser.hasOwnProperty('$promise')) ?
        currentUser.$promise : currentUser;
      return $q.when(value)
        .then(user => {
          safeCb(callback)(user);
          return user;
        }, () => {
          safeCb(callback)({});
          return {};
        });
    },

    /**
     * Check if a user is logged in
     *   (synchronous|asynchronous)
     *
     * @param  {Function|*} callback - optional, function(is)
     * @return {Bool|Promise}
     */
    isLoggedIn(callback) {
      if (arguments.length === 0) {
        return currentUser.hasOwnProperty('role');
      }

      return Auth.getCurrentUser(null)
        .then(user => {
          var is = user.hasOwnProperty('role');
          safeCb(callback)(is);
          return is;
        });
    },

     /**
      * Check if a user has a specified role or higher
      *   (synchronous|asynchronous)
      *
      * @param  {String}     role     - the role to check against
      * @param  {Function|*} callback - optional, function(has)
      * @return {Bool|Promise}
      */
    hasRole(role, callback) {
      var hasRole = function(r, h) {
        return userRoles.indexOf(r) >= userRoles.indexOf(h);
      };

      if (arguments.length < 2) {
        return hasRole(currentUser.role, role);
      }

      return Auth.getCurrentUser(null)
        .then(user => {
          var has = (user.hasOwnProperty('role')) ?
            hasRole(user.role, role) : false;
          safeCb(callback)(has);
          return has;
        });
    },

     /**
      * Check if a user is an admin
      *   (synchronous|asynchronous)
      *
      * @param  {Function|*} callback - optional, function(is)
      * @return {Bool|Promise}
      */
    isAdmin() {
      return Auth.hasRole
        .apply(Auth, [].concat.apply(['admin'], arguments));
    },

    /**
     * Check if a user is an admin-light (coder)
     *   (synchronous|asynchronous)
     *
     * @param  {Function|*} callback - optional, function(is)
     * @return {Bool|Promise}
     */
    // isAdminLight() {
    //     return Auth.hasRole
    //       .apply(Auth, [].concat.apply(['asfasdf'], arguments));
    // },

    /**
     * Get auth token
     *
     * @return {String} - a token string used for authenticating
     */
    getToken() {
      return $cookies.get('token');
    },

    /**
     *
     * Updates User
     *
     */
    updateUser(user){
      return $http.put('/api/users/', user)
        .then(res => {
          return res.$promise;
        })
        .catch(err => {
          return $q.reject(err.data);
        });
    },

    /**
     *
     * Updates/Sets the step of current User
     *
     */
    setUserStep(step){

      return Auth.getCurrentUser(null)
        .then(user => {
          user.step = step;
          return Auth.updateUser(user);
      }, function(err){
          return Auth.updateUser(StorageUtil.retrieveSStorage('user'));
      });

    }


  };

  return Auth;
}

angular.module('rationalecapApp.auth')
  .factory('Auth', AuthService);

})();
