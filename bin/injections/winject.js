var WayneSocket = {
	sendEvent: function(evt){
		chrome.extension.sendMessage(evt);
	}
}
//Kill listeners on AEC select
//Scope event sends
//Scope high this calls
var Winston = {
	loaded: false,
	do_kill: false,

	initialize: function(){

	},

	destroyListeners: function(killWayne){
		$(document).unbind(".wayne");
		if(killWayne){
			$("*").unbind(".waynecr");
			$("body").children("#winston_box").remove();
		}
		$("*").unbind(".wayne");
		this.loaded =false;
	},

	loadListeners: function(){
		$(document).on("blur.wayne",function(){//TextField
			sendEvent({action: "FieldBlur", target: this.name,value:$(this).val()});
		});

		$(document).on('change.wayne',function(event){
			sendEvent({action: "FileUpload", target: this.name,value:$(this).val()});
		});

		$(document).on('change.wayne', function(){
			if($(this).is(':checked')){
	        	sendEvent({action: "CheckboxCheck", target: object.name, value: $(object).val()});
	    	} else {
	        	sendEvent({action: "CheckboxUnCheck", target: object.name, value: $(object).val()});
	    	}
		});

		$(document).on('change.wayne', function(){
			var sval = $(object).find("option:selected").html();
			sendEvent({action: "SelectChange", target: this.name, value: sval});
		});

		$(document).on('submit.wayne', function (event){
			//sendEvent({action: "SubmitForm", target: object.id});
		});

		$(document).on("mouseover.wayne",function(event){
			if(event.target.className.indexOf("wayne_") == -1 && event.target.id.indexOf("wayne_") == -1){
				$(event.target).addClass("wayne_hover");
			}
		});

		$(document).on("mouseout.wayne",function(event){
				$(event.target).removeClass("wayne_hover");
		});
		// left here
		$(document).bind("mouseover.wayne",function(event){
            if(event.target.className.indexOf("wayne_") == -1 && event.target.id.indexOf("wayne_") == -1){
                    $(event.target).addClass("wayne_hover");
            }
        });

        $(document).on("mouseout.wayne",function(event){
			$(event.target).removeClass("wayne_hover");
        });

        $(document).on('click.wayne', "input:submit" function(){
                if(!selecting){
                        var object = this;
                        if(allowLabelClick){
                                sendEvent({action: "SubmitClick", target: object.name, value: $(object).val()});
                                return true;
                        }else{
                                return fullProcessClickedObject(object);
                        }
                }else{
                        return false;
                }
        });
        /*
        $(document).on("keydown.wayne",function(event){
                if(selecting && selected_object!=null){
                    switch(event.keyCode){
                            case 37: //left arrow
                                    traverseSelected(selected_object,-1);
                                    break;
                            case 38: // up arrow
                                    traverseSelected(selected_object,2);
                                    break;
                            case 39: // Right arrow
                                    traverseSelected(selected_object,1);
                                    break;
                            case 40: // Down arrow
                                    traverseSelected(selected_object,-2);
                                    break;
                            case 13: //Enter
                                    processSelect(selected_object,false);
                                    break;
                            default:
                                    break;
                    }        
                }
        });*/

        if(loadWayne){
                lock_ajax=true;
                $("#wayne_undo").live('click.waynecr',function(){
                        sendEvent({action:"Wayne",target:"undo"});
                        return false;
                });

                $("#wayne_redo").live('click.waynecr',function(){
                        sendEvent({action:"Wayne",target:"redo"});
                        return false;
                });

                $("#wayne_kill").live('click.waynecr',function(){
                        sendEvent({action: "Wayne", target: "kill"});
                        return false;
                });

                $("#wayne_pause").live('click.waynecr',function(){
                        paused = !paused;
                        if(paused){
                                destroyListeners(false);
                                $("b.wayne_name").html("Wayne[Paused]");
                                $("b#wayne_pause").html("▶");
                        }else{
                                loadListeners(false);
                                $("b.wayne_name").html("Wayne");
                                $("b#wayne_pause").html("∎");
                        }
                        return false;
                });


                $("#wayne_select").live('click.waynecr',function(){
                        if(selecting){
                                disableSelectMode();
                                setHeaderMsg("notify","Canceled Element Selection");
                        }
                        return false;
                });
                wayneLoaded=true;
                lock_ajax=false;
        }


		//The money shot.

		$(document).bind("click.wayne",function(event) {
			var object=event.target;
			$(object).removeClass("wayne_hover");
			if(object.className.indexOf("winston_") == -1 && object.id.indexOf("winston_") == -1){
				// Do stuff
			}
		});
	}
}

$(document).bind("ready",function(){
	sendEvent({action:"Wayne",target:"Damnit Wayne! Where's all the liquor!?"});
});