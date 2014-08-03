'use strict';

angular.module('dropstore',[])
  .factory('dropstoreClient',function($q,dropstoreDatastoreManager){
    var dropstoreServices = {};
    dropstoreServices.create = function(client){
      dropstoreServices._client = client;
      return dropstoreServices;
    };
    dropstoreServices.authenticate = function(options){
      var deferred = $q.defer();
      dropstoreServices._client.authenticate(options,function(err,res){       
        if(err){
          deferred.reject(err);
        }        
        else if(dropstoreServices._client.isAuthenticated()){
          deferred.resolve(dropstoreDatastoreManager(res));
        }
      });
      return deferred.promise;
    }
    return dropstoreServices;
  })
  .factory('dropstoreDatastoreManager', ['$q', function($q){
    return function(_client){
      var dropstoreDatastoreManagerService = {};
      dropstoreDatastoreManagerService._client = _client;
      dropstoreDatastoreManagerService._datastoreManager = dropstoreDatastoreManagerService._client.getDatastoreManager();

      dropstoreDatastoreManagerService.openDefaultDatastore = function(){
        var deferred = $q.defer();
        dropstoreDatastoreManagerService._datastoreManager.openDefaultDatastore(function(err,datastore){          
          if(err)
            deferred.reject(err);
          else{
            dropstoreDatastoreManagerService._datastore = datastore;
            deferred.resolve(datastore);
          }           
        })
        return deferred.promise;
      };
      dropstoreDatastoreManagerService.SubscribeRecordsChanged = function(callback){        
        dropstoreDatastoreManagerService._datastore.recordsChanged.addListener(callback);
        return callback;
      };
      dropstoreDatastoreManagerService.SubscribeSyncStatusChanged = function(callback){       
        dropstoreDatastoreManagerService._datastore.syncStatusChanged.addListener(callback);
        return callback;
      };
      dropstoreDatastoreManagerService.signOut = function(options){
        var deferred = $q.defer();
        dropstoreDatastoreManagerService._client.signOut(options,function(err){         
          if(err)
            deferred.reject(err);
          else{            
            deferred.resolve();
          }           
        });
        return deferred.promise;
      }
      return dropstoreDatastoreManagerService;
    };    
  }])

var app = angular.module('timelineApp',['timelineApp.controllers','dropstore','ngRoute'])
  .directive('ngReallyClick', [function() {
      return {
          restrict: 'A',
          link: function(scope, element, attrs) {
              element.bind('click', function() {
                  var message = attrs.ngReallyMessage;
                  if (message && confirm(message)) {
                      scope.$apply(attrs.ngReallyClick);
                  }
              });
          }
      }
  }])  
  .directive('syncFocusWith', function ($timeout) {
    return function (scope, elem, attrs) {
      scope.$watch(attrs.syncFocusWith, function () {
        elem[0].focus();
      });
    };
  })
  app.factory('timelineService', function() {
    var invoiceItems = [];    

    return {
      getInvoiceItems: function () {
        return invoiceItems;
      },
      setInvoiceItems: function (items) {
        invoiceItems = items;
      }      
    }
  })
  .config(['$routeProvider','$locationProvider',
  function($routeProvider, $locationProvider) {   
    $routeProvider.         
      when('/login', {        
        templateUrl: 'views/login.html',
        controller: 'loginCtrl'
      }).
      when('/invoice', {        
        templateUrl: 'views/invoice.html',
        controller: 'invoiceCtrl'
      }).
      when('/', {
        templateUrl: 'views/case-grid.html',
        controller: 'caseCtrl'        
      }).
      when('/activity/:caseId', {
        templateUrl: 'views/activity.html',
        controller: 'activityCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
      //$locationProvider.html5Mode(true);
  }
  ])
  .run(function($rootScope,dropstoreClient,$location,$window){
    var _datastoreManager = null;    
    var client = new Dropbox.Client({key: 'b4qas6a6edcikvd'});    
    dropstoreClient.create(client)
      .authenticate({interactive: false})
      .then(function(datastoreManager){                                
        $rootScope.$broadcast('loggedIn');
        _datastoreManager = datastoreManager;
        return datastoreManager.openDefaultDatastore();
      })      
      .then(function(datastore){                                 
        dropstoreClient.datastore = datastore; 
        dropstoreClient.datastoreManager = _datastoreManager;                       
        
        //1.
        $window.onbeforeunload = function (e) {
          if (dropstoreClient.datastore && dropstoreClient.datastore.getSyncStatus().uploading) {
            return "You have pending changes that haven't been synchronized to the server.";
          }
        };  

        //2.
        _datastoreManager.SubscribeRecordsChanged(function(records){        
          $rootScope.$broadcast('recordChanged',records);
        });

        //3.
        _datastoreManager.SubscribeSyncStatusChanged(function(){        
          $rootScope.$broadcast('syncStatusChanged');
          if(datastore.getSyncStatus().uploading){
            document.getElementById('status').innerHTML = "Synchronizing...";
          }
          else{
            document.getElementById('status').innerHTML = "Synchronized";
          }
          //console.log(_datastore.getSyncStatus().uploading);
        });

        document.getElementById('status').innerHTML = "Connected";
        if($location.search().next){
          $location.path($location.search().next).search({}); 
        }
        else{
          $location.path('/');   
        }
        
      })
      .catch(function(err){             
        if(err instanceof Dropbox.AuthError){
          dropstoreClient._client.reset();
        }
        alert(err.toString() );        
      });
  });
