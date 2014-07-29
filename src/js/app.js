'use strict';

angular.module('dropstore',[])
	.factory('dropstoreClient',function($q,dropstoreDatastoreManager){
		var dropstoreServices = {};
		dropstoreServices.create = function(options){
			dropstoreServices._client = new Dropbox.Client(options);
			return dropstoreServices;
		};

		dropstoreServices.authenticate = function(options){
			var deferred = $q.defer();
			dropstoreServices._client.authenticate(options,function(err,res){				
				if(err){
					deferred.reject(err);
				}
				else{
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
			return dropstoreDatastoreManagerService;
		};		
	}])

var app = angular.module('timelineApp',['timelineApp.controllers','dropstore','ngRoute','ui.bootstrap'])
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
	.config(['$routeProvider','$locationProvider',
  function($routeProvider, $locationProvider) {  	
    $routeProvider.       	
    	when('/login', {        
    		template: '<h2 class="text-center" style="color:#999">Authenticating ....</h2>',
        controller: 'loginCtrl'
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
    var _datastore = null;
        
    dropstoreClient.create({key: 'b4qas6a6edcikvd'})
      .authenticate({interactive: true})
      .then(function(datastoreManager){                                
        _datastoreManager = datastoreManager;
        return datastoreManager.openDefaultDatastore();
      })      
      .then(function(datastore){                
        $rootScope.datastore = datastore;
        _datastore = datastore;        
        //1.
        $window.onbeforeunload = function (e) {
          if ($rootScope.datastore.getSyncStatus().uploading) {
            return "You have pending changes that haven't been synchronized to the server.";
          }
        };  

        //2.
        _datastoreManager.SubscribeRecordsChanged(function(records){        
          $rootScope.$broadcast('recordChanged',records);
        });
        _datastoreManager.SubscribeSyncStatusChanged(function(){        
          $rootScope.$broadcast('syncStatusChanged');
          if(_datastore.getSyncStatus().uploading){
          	document.getElementById('status').innerHTML = "Synchronizing...";
          }
          else{
          	document.getElementById('status').innerHTML = "Synchronized";
          }
          console.log(_datastore.getSyncStatus().uploading);
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
        var errStr = err.description || err.response.error || '';
        alert("Error Occured: " + errStr );
      });
  });
