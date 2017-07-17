'use strict';

angular.module('rationalecapApp')
  .controller('BlockModalCoderController', function($scope, $element, title, close, block, content, edit, Auth) {

    $scope.title = title;
    $scope.edit = edit;
    $scope.block = block;
    $scope.list = ["one", "two", "thre", "four", "five", "six"];

    if(!$scope.block){
      $scope.block = {};
      $scope.block.alternatives = [{}];
    }
    $scope.renderedContent_temp = [];
    if($scope.block.content){
      $scope.renderedContent_temp = $scope.block.content.split('\\n');
    }
    else if(content){
      $scope.renderedContent_temp = content.content.split('\\n');
    }

    $scope.renderedContent = [];
    for(var i = 0; i < $scope.renderedContent_temp.length; i++){
      $scope.renderedContent.push({id: i, content: $scope.renderedContent_temp[i]});
    }

    $scope.blockCodesIndex = 0;
    loadCoderCodes();

    $scope.step = 1;

    //  This close function doesn't need to use jQuery or bootstrap, because
    //  the button has the 'data-dismiss' attribute.
    $scope.close = function(form) {
      if(form){
        form.$setSubmitted();
        if(form.$valid){

          console.log('block.blockcodes', $scope.block.blockCodes);
          if(!$scope.block.blockCodes || $scope.block.blockCodes.length <= 0){
            $scope.block.blockCodes = [{'coder' : $scope.user, 'codes' : $scope.coderCodes}];
          }
          else{
            $scope.block.blockCodes[$scope.blockCodesIndex].codes = $scope.coderCodes;
          }
          $element.modal('hide');
          close($scope.block, 500); // close, but give 500ms for bootstrap to animate
        }
      }
    };

    //  This cancel function must use the bootstrap, 'modal' function because
    //  the doesn't have the 'data-dismiss' attribute.
    $scope.cancel = function() {

      //  Manually hide the modal.
      $element.modal('hide');

      close(undefined, 500); // close, but give 500ms for bootstrap to animate
    };



    $scope.showDiff = function(){
      $element.modal('hide');
      close('showFilesDiff', 500);
    };


    $scope.addCode = function(){
      $scope.coderCodes.push({});
    };

    $scope.spliceCode = function(){
      if($scope.coderCodes.length > 0){
        $scope.coderCodes.splice($scope.coderCodes.length-1, 1);
      }

    };

    $scope.increaseStep = function(form){
      if(form.$valid){
        $scope.step++;
        form.$setPristine();
      }
      else{
        form.$setSubmitted();
      }
    };


    $scope.textAreaAdjust = function(id) {
      let element = document.getElementById(id);
      element.style.height = (element.scrollHeight > element.clientHeight) ? (element.scrollHeight)+"px" : "60px";

    };


    //========HELPER FUNCTION
    function loadCoderCodes(){
      let blockCodes = $scope.block.blockCodes;

      Auth.getCurrentUser(function(user){
        console.log('current user', user.username);
        $scope.user = user.username;
        if(!blockCodes || blockCodes.length <= 0){
          // $scope.coderCodes = [{'codeText' : '', 'code' : ''}];
          $scope.coderCodes = [];

          return;
        }
        console.log('blockCodes', blockCodes);

        for(let i = 0; i < blockCodes.length; i++){
          if(blockCodes[i].coder === user.username){
            $scope.blockCodesIndex = i;
            $scope.coderCodes = blockCodes[i].codes;
            return;
          }
        }
        // $scope.coderCodes = [{'codeText' : '', 'code' : ''}];
        $scope.blockCodesIndex = $scope.block.blockCodes.push({coder: $scope.user, codes:[]});
        $scope.blockCodesIndex = $scope.block.blockCodes.length-1;
        $scope.coderCodes = [];
      });

    }

  });
