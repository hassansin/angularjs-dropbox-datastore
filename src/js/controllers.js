angular.module('timelineApp.controllers',[])
  .controller('loginCtrl',['$rootScope','$location','$window','dropstoreClient',function($rootScope,$location,$window,dropstoreClient){        
    if($rootScope.datastore===undefined){            
      $location.path('/login');
    } else{                
      $location.path('/');
    }    
  }])
  .controller('caseCtrl',function($scope,$rootScope,$location,$timeout,$filter){    
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
      n.activity_date = new Date(n.activity_date);
      if(n.activity_date){
        $scope.editCaseRecord = null; 
        if(!angular.equals(c.getFields(),n))
          c.update(n);        
      }
      
    };
    $scope.updateCase = function(c,e){          
      $scope.editCase = c.getFields();      
      $scope.editCase.activity_date = $filter('date')($scope.editCase.activity_date,'MM/dd/yyyy')
      $scope.editCaseRecord = c; 
      $scope.newCase = false;         
      
      /*if(angular.element(e.target).find('input')[0]){
        $timeout(function(){
          angular.element(e.target).find('input')[0].focus();
        },100);      
      }      */
    };
    $scope.addCase = function(c){          
      $scope.case = {};    
      c.activity_date = new Date(c.activity_date);
      if(c.activity_date)
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
  .controller('activityCtrl',function($scope,$rootScope,$routeParams,$location,$filter,$timeout){
    var _datastore = null;  
    $scope.isLoaded = !($rootScope.datastore===undefined); //checks if the datastore is loaded and prevents flicker   
    $scope.caseId = $routeParams.caseId;  // current case id        
    $scope.activities = []; //activity list for current case
    $scope.activity = {}; // new activity model to be added
    $scope.case = {}; // current case object
    $scope.editCase = {}; // editing case object
    $scope.edited = '';    // to detect if editing mode, used in ng-class
    $scope.dirtyActivites = []; // activities that are not synced        

    $scope.saveAct = function(a,n){            
      var matched = n.activity_time.match(/(?:(\d{1,2})(\d{2})(am|pm))|(?:(\d+):(\d+)\s*(am|pm))/i);
      if(matched){
        matched = matched.filter(function(x){return x!==undefined});
      }      
      if(matched && matched.length === 4){
        var time = new Date($filter('date')($scope.case.get('activity_date'),'MM/dd/yyyy') + ' ' + matched[1]+':'+matched[2]+' '+matched[3]);        
        if(time == "Invalid Date"){
          alert('Invalid Time');
        }else{
          n.activity_time = time;
          $scope.activity = {};          
          $scope.editActRecord = null;           
          if(!angular.equals(a.getFields(),n))
            a.update(n);       
        }        
      }   
      else{
        alert('Invalid Time')
      }                     
    };
    $scope.updateAct = function(a,e){            
      $scope.editAct = a.getFields();      
      $scope.editAct.activity_time = $filter('date')($scope.editAct.activity_time, 'hh:mm a')
      $scope.editActRecord = a;        
      /*if(angular.element(e.target).find('input')[0]){        
        $timeout(function(){
          angular.element(e.target).find('input')[0].focus();
        },100);      
      } */          
    };   

    $scope.addActivity = function(a){            
      var matched = a.activity_time? a.activity_time.match(/(?:(\d{1,2})(\d{2})(am|pm))|(?:(\d+):(\d+)\s*(am|pm))/i):'';
      if(matched){
        matched = matched.filter(function(x){return x!==undefined});
      }      
      if(matched && matched.length === 4){
        var time = new Date($filter('date')($scope.case.get('activity_date'),'MM/dd/yyyy') + ' ' + matched[1]+':'+matched[2]+' '+matched[3]);
        if(time == "Invalid Date"){
          alert('Invalid Time');          
        }
        else{
          a.activity_time = time;
          $scope.activity = {};          
          a.caseId = $scope.caseId;
          activityTable.insert(a);                
        }
      }
      $scope.ngDoFocus();                
    };
    $scope.deleteAct= function(a){   
      a.deleteRecord();
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