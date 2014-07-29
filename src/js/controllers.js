
angular.module('timelineApp.controllers',[])
  .controller('loginCtrl',['$rootScope','$location','$window','dropstoreClient',function($rootScope,$location,$window,dropstoreClient){        

  }])
  .controller('caseCtrl',function($scope,$rootScope,$location){    
    var _datastore = null;    
    $scope.orderProp = 'activity_date';
    $scope.reverse = false;
    $scope.caseOrder = function(c){      
      return c.get($scope.orderProp);
    };

    $scope.isLoaded = !($rootScope.datastore===undefined);    
    $scope.newCase = false;
    $scope.cases = [];
    $scope.case = {}; 
    $scope.editCase = {};     
    $scope.edited = '';    
    $scope.saveCase = function(c,n){      
      $scope.editCaseRecord = null; 
      c.update(n);      
    };
    $scope.updateCase = function(c){            
      $scope.editCase = c.getFields();      
      $scope.editCaseRecord = c; 
      $scope.newCase = false;         
    };
    $scope.addCase = function(c){          
      $scope.case = {};    
      //c.activity_date = $filter('date')(date, format)
      caseTable.insert(c);
    };
    $scope.deleteCase = function(c){
      var activities = $rootScope.datastore.getTable('activities').query({caseId:c.getId()});                            
      angular.forEach(activities, function(value, key) {
        value.deleteRecord();
      });
      c.deleteRecord();
    };
    $scope.$on('recordChanged',function(event,records){
      var records = records.affectedRecordsForTable('cases');
      for(var ndx in records){
        var record = records[ndx];
        if(record.isDeleted()){
          for(var s_ndx in $scope.cases){
            var curr_record = $scope.cases[s_ndx];
            if(curr_record.getId() == record.getId()){
              $scope.cases.splice($scope.cases.indexOf(curr_record), 1);
              //deleted task
              break;
            }
          }
        }
        else{            
          var found= false;
          //task is new or updated.
          for(var s_ndx in $scope.cases){
            var curr_record = $scope.cases[s_ndx];
            if(curr_record.getId() == record.getId()){
              $scope.cases[$scope.cases.indexOf(curr_record)] = record;
              found = true;
              //udpate task
              break;
            }
          }
          if(!found){
            $scope.cases.push(records[ndx]);
          }
        }
      }
    });    
    if($rootScope.datastore===undefined){            
      $location.path('/login');
    } else{                
      var caseTable = $rootScope.datastore.getTable('cases');        
      $scope.cases =  caseTable.query();      
    }           
  })
  .controller('activityCtrl',function($scope,$rootScope,$routeParams,$location,$filter){
    var _datastore = null;  
    $scope.isLoaded = !($rootScope.datastore===undefined); //checks if the datastore is loaded and prevents flicker   
    $scope.caseId = $routeParams.caseId;  // current case id        
    $scope.activities = []; //activity list for current case
    $scope.activity = {}; // new activity model to be added
    $scope.case = {}; // current case object
    $scope.editCase = {}; // editing case object
    $scope.edited = '';    // to detect if editing mode, used in ng-class
    $scope.dirtyActivites = []; // activities that are not synced
    $scope.isUploading = false; //flag to detect if uploading is in progress

    $scope.saveAct = function(a,n){      
      $scope.editActRecord = null; 
      a.update(n);      
    };
    $scope.updateAct = function(a){            
      $scope.editAct = a.getFields();      
      $scope.editAct.activity_time = $filter('date')($scope.editAct.activity_time, 'HH:mm')
      $scope.editActRecord = a;       
    };   

    $scope.addActivity = function(a){      
      $scope.activity = {};          
      a.caseId = $scope.caseId;
      activityTable.insert(a);      
    };
    $scope.deleteAct= function(a){   
      a.deleteRecord();
    };
    $scope.today = function() {
      $scope.dt = new Date();
    };    
    $scope.disabled = function(date, mode) {
      return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
    };
    $scope.dateOptions = {      
      formatYear: 'yy',
      startingDay: 1
    };
    $scope.initDate = new Date();    
    $scope.format = "MM/dd/yyyy hh:mm a";
    $scope.open = function($event) {      
      $scope.opened = true;
    };
    $scope.$on('syncStatusChanged',function(event){      
      if(!$rootScope.datastore.getSyncStatus().uploading){
        $scope.dirtyActivites = [];
        $scope.$apply();
      }
    });

    $scope.$on('recordChanged',function(event,records){

      var records = records.affectedRecordsForTable('activities');
      for(var ndx in records){
        var record = records[ndx];
        if(record.isDeleted()){
          for(var s_ndx in $scope.activities){
            var curr_record = $scope.activities[s_ndx];
            if(curr_record.getId() == record.getId()){
              $scope.activities.splice($scope.activities.indexOf(curr_record), 1);
              //deleted task
              break;
            }
          }
        }
        else{   
          $scope.dirtyActivites.push(records[ndx].getId());
          var found= false;
          //task is new or updated.
          for(var s_ndx in $scope.activities){
            var curr_record = $scope.activities[s_ndx];
            if(curr_record.getId() == record.getId()){
              $scope.activities[$scope.activities.indexOf(curr_record)] = record;
              found = true;
              //udpate task
              break;
            }
          }
          if(!found){            
            $scope.activities.push(records[ndx]);
          }
        }
      }
    });

    if($rootScope.datastore===undefined){            
      $location.path('/login').search({next:'/activity/'+$scope.caseId});
    } else{                
      var activityTable = $rootScope.datastore.getTable('activities');        
      var caseTable = $rootScope.datastore.getTable('cases');
      $scope.case = caseTable.get($scope.caseId);
      $scope.activities =  activityTable.query({caseId:$scope.caseId});            
    }           
  });