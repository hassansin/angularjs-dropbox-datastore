angular.module('timelineApp.controllers',[])
  .controller('mainCtrl', ['$scope','$rootScope','$location','dropstoreClient','timelineService', function($scope,$rootScope,$location,dropstoreClient,timelineService){

    //http://stackoverflow.com/questions/16928341/update-parent-scope-variable
    $scope.topCtrl = {};
    $scope.topCtrl.isLogged = false;

    $scope.$on('loggedIn',function(){      
      $scope.topCtrl.isLogged = true;
    })    

    $scope.logout = function(){
      if( dropstoreClient.datastore)        
        dropstoreClient.datastoreManager.signOut({},function(err){
          if(err){
            alert(err.toString());
          }
          else{            
          }          
        });    
        dropstoreClient.datastore = undefined;
        $scope.topCtrl.isLogged = false;
        $location.path('/login');
        dropstoreClient._client.reset();  
    };   
  }])
  .controller('loginCtrl',['$scope','$rootScope','$location','$window','dropstoreClient','timelineService',function($scope,$rootScope,$location,$window,dropstoreClient,timelineService){          
    $scope.isLoaded = false;        
    if(dropstoreClient.datastore===undefined){                        

      $scope.login = function(){
        dropstoreClient._client.authenticate({interactive:true});
      };
    } else{                      
      $location.path('/');      
    }    
  }])
  .controller('caseCtrl',function($scope,$rootScope,$location,$timeout,$filter,dropstoreClient,timelineService){        
    var _datastore = null;    
    $scope.orderProp = 'activity_date';
    $scope.reverse = false;
    $scope.caseOrder = function(c){      
      return c.get($scope.orderProp);
    };

    $scope.isLoaded = !(dropstoreClient.datastore===undefined);    
    $scope.newCase = false;
    $scope.cases = [];
    $scope.case = {}; 
    $scope.editCase = {};     
    $scope.edited = '';    
    $scope.selectedCases = timelineService.getInvoiceItems(); //selected cases for invoice
    $scope.addAllToSelection = function(event){
      if(event.target.checked) {
        angular.forEach($scope.cases,function(val,key){
          $scope.selectedCases.push(val.getId());
        });
      }
      else
        $scope.selectedCases = [];

    };
    $scope.addToSelection = function (event,caseId){
      if(event.target.checked)
        $scope.selectedCases.push(caseId);     
      else
        $scope.selectedCases.splice($scope.selectedCases.indexOf(caseId),1);
      console.log($scope.selectedCases);
    };
    $scope.prepareInvoice = function (){
      timelineService.setInvoiceItems($scope.selectedCases);
      $location.path('/invoice');
    };   
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
      var activities = dropstoreClient.datastore.getTable('activities').query({caseId:c.getId()});                            
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
    if(dropstoreClient.datastore===undefined){            
      $location.path('/login');
    } else{                
      var caseTable = dropstoreClient.datastore.getTable('cases');        
      $scope.cases =  caseTable.query();      
    }           
  })
  .controller('activityCtrl',function($scope,$rootScope,$routeParams,$location,$filter,$timeout,$http,dropstoreClient){
    var _datastore = null;  
    $scope.isLoaded = !(dropstoreClient.datastore===undefined); //checks if the datastore is loaded and prevents flicker   
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
    };
    $scope.deleteAct= function(a){   
      a.deleteRecord();
    };    
    $scope.downloadAct = function($attach){
      var activities = dropstoreClient.datastore.getTable('activities').query({caseId:$scope.caseId});            
      var c = dropstoreClient.datastore.getTable('cases').get($scope.caseId);
      var data = {};
      data.timezoneOffset = c.get('activity_date').getTimezoneOffset()*60;
      data.id = c.getId();
      data.case = c.getFields();
      data.activities = [];
      angular.forEach(activities, function(act, key) {
        data.activities.push(act.getFields());
      });
      $http({
        method  : 'POST',
        url     : 'download.php',
        data    : data,  // pass in data as strings
        headers : { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
      })
      .success(function(data) {        
        if(data && data.success){          
          if($attach)
            window.location.href='mailto:?subject='+ encodeURIComponent(data.title)+'&body=%0D%0A%0D%0A%0D%0A%0D%0A%0D%0A' + encodeURIComponent('Download from: '+data.url);
          else  
            window.location.href=data.url;
        }
      });
    }
    $scope.$on('syncStatusChanged',function(event){      
      if(!dropstoreClient.datastore.getSyncStatus().uploading){
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

    if(dropstoreClient.datastore===undefined){            
      $location.path('/login').search({next:'/activity/'+$scope.caseId});
    } else{                
      var activityTable = dropstoreClient.datastore.getTable('activities');        
      var caseTable = dropstoreClient.datastore.getTable('cases');
      $scope.case = caseTable.get($scope.caseId);
      $scope.activities =  activityTable.query({caseId:$scope.caseId});            
    }           
  })
  .controller('invoiceCtrl', ['$scope','$rootScope','$location','$filter','$http','timelineService','dropstoreClient', function($scope,$rootScope,$location,$filter,$http,timelineService,dropstoreClient){
    var _datastore = null;  
    $scope.isLoaded = !(dropstoreClient.datastore===undefined); //checks if the datastore is loaded and prevents flicker       
    if(timelineService.getInvoiceItems().length==0)
      $location.path('/');
    else{
      var caseIds = timelineService.getInvoiceItems();
      _datastore = dropstoreClient.datastore;
      
      var data = [];      
      var activityTable = dropstoreClient.datastore.getTable('activities');        
      var caseTable = dropstoreClient.datastore.getTable('cases');
      var invoiceTable = dropstoreClient.datastore.getTable('invoices');
      var totalQuantity = 0;

      //loop through selected case ids
      angular.forEach(caseIds,function(id,key){
        var caseFields = caseTable.get(id).getFields(); //get case
        caseFields.full_name = caseFields.first_name + ' ' + caseFields.last_name;
        var actList = activityTable.query({caseId:id}) // get all activities for this case
        var activities = [];
        var departureTime = 0;
        var arrivalTime = 0;        

        //loop through activities
        angular.forEach(actList,function(act,key){
          var actFields = act.getFields();
          activities.push(actFields);
          if(actFields.activity_type==='Base D')
            departureTime = actFields.activity_time.getTime();
          if(actFields.activity_type==='Base A')
            arrivalTime = actFields.activity_time.getTime();
        });

        quantityPerCase = (arrivalTime - departureTime)/(1000*60*60);        

        data.push({
          'case': caseFields,
          /*'activities' : activities,*/
          'quantity' : quantityPerCase,
          'unitCost': 25          
        });
      });

      $scope.subTotal = function() {
        var total = 0.00;
        angular.forEach($scope.invoice.items, function(item, key){
          total += (item.quantity * item.unitCost);
        });
        return total;
      };
      $scope.removeItem = function (item){
        $scope.invoice.items.splice($scope.invoice.items.indexOf(item), 1);
      };
      $scope.addItem = function (){
        $scope.invoice.items.push({
          'case': {},
          activities : [],
          quantity: 1 ,
          unitCost: 25
        })
      };
      $scope.downloadInvoice = function ($attach){                
        var info = _datastore.getTable('info').query({type:'invoiceInfo'});
        var invoiceInfo = {
          type    : 'invoiceInfo',
          company : $scope.invoice.company,
          address : $scope.invoice.address,
          phone   : $scope.invoice.phone,
          lastInvoiceNo : $scope.invoice.invoiceNo,
          terms   : $scope.invoice.terms,
        };

        if(info.length){
          info[0].update(invoiceInfo);
        }else{
          infoTable.insert(invoiceInfo);
        }

        $http({
          method  : 'POST',
          url     : 'download_invoice.php',
          data    : $scope.invoice,  // pass in data as strings
          headers : { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
        .success(function(data) {
          console.log(data);
          if(data && data.success){
            if($attach)
              window.location.href='mailto:?subject='+ encodeURIComponent(data.title)+'&body=%0D%0A%0D%0A%0D%0A%0D%0A%0D%0A' + encodeURIComponent('Download from: '+data.url);
            else  
              window.location.href=data.url;
          }
        });
      };
      var info = _datastore.getTable('info').query({type:'invoiceInfo'});
      info = info.length?info[0].getFields(): {};

      $scope.invoice = {
        items: data,
        date: $filter('date')(new Date(),'MMM dd, yyyy'),
        timezoneOffset : new Date().getTimezoneOffset(),
        phone: info.phone || '(919) 878-9988',
        company: info.company || "Cat's Eye Private Investigations",
        address: info.address || "1009-101 Bullard Court\nRaleigh, NC 27615",
        invoiceNo: '0000001', 
        terms: info.terms || 'NET 30 Days. Finance Charge of 1.5% will be made on unpaid balances after 30 days.',
        paid: 0  
      };          
    }
  }]);