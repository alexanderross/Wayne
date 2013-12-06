
var selecting=false;
var selecting_level = 0;
var running=false;
var paused=false;
var wayneLoaded=false;
var lock_ajax=false;
var allowIndex=false;
var allowLabelClick=true;
var enforce_denied=false;
var selected_object=null;
var requiredSymbols=[];
var deniedSymbols=[];
var mode="XPATH";
var last_ts="";


//TODO - RESOLVE BY SCOPE
//This should be wrapped in an object. But lazy.

/* 
IVMB:RAILMAG
KV:DRESDEN_CORE
D:EnCt2027651b7bce62c750f11dcfb86568a98498b4628027651b7bce62c750f11dcfb1FIZ/U5E2gH
jQj0Y81AMCat+L5jTfuIm4udikMr3ru/25LynlRnw6GT+MoiOnp7U4k5eYsoPPVa9eJr/cz5UZ2sjZUg
=IwEmS
*/

$(document).bind("ready",function(){
	sendEvent({action:"Wayne",target:"Damnit Wayne! Where's all the liquor!?"});
});

function processSelect(object,screen){
	success=false;
	var scoped=null;
	$(".wayne_lockon_assoc").removeClass("wayne_lockon_assoc");
	$(".wayne_lockon").removeClass("wayne_lockon");
	$(".wayne_hover").removeClass("wayne_hover");

	if(object.id){
		target_tg = object.tagName.toLowerCase()+"#"+object.id;
		if(!resolves_singular(target_tg)){
			if(!screen){
				sendEvent({action: "AssertCount", target: target_tg, value: $(target_tg).length });
			}
			scoped=target_tg;
		}
	}
	if(!scoped && $(object)[0].className!=""){
		target = object.tagName.toLowerCase()+"."+$(object)[0].className.replace(/ /g,".");
		if(!screen){
			sendEvent({action: "AssertCount", target: target, value: $(target).length  });
		}
		scoped=target;
	}
	if(!scoped){
		last_chance=resolve_to_any_attr(object,false);
		check=satisfies_selector_quality(last_chance[1])
		if(check[0]){
			if(!screen){
				sendEvent({action: "AssertCount", target: last_chance[1], value: $(last_chance[1]).length  });
			}
			scoped=last_chance[1];
		}else{
			setHeaderMsg("error","The element selected doesn't satisfy your required selector : \""+check[1]+"\"");
		}
	}
	if(scoped && !screen){
		disableSelectMode();
		//$(scoped).addClass("wayne_selected");
	}else if(screen && scoped){
		$(scoped).addClass("wayne_lockon_assoc");
		updateSelectDisplay($(scoped).length,scoped);
	}

	return false;
}

function satisfies_selector_quality(selector){
	if(selector!=""){
		for(var i=0;i<requiredSymbols.length;i++){
			if(selector.indexOf(requiredSymbols[i])==-1){
				return [false,requiredSymbols[i],false]
			}
		}
		for(var i=0;i<deniedSymbols.length;i++){
			if(selector.indexOf(deniedSymbols[i])>=0){
				return [false,deniedSymbols[i],true];
			}
		}
 	}else{
 		return [false,"Anything",false];
 	}
 	return [true,"",false];
}

function isAllowed(selector){
	for(var i=0;i<deniedSymbols.length;i++){
		if(selector.indexOf(deniedSymbols[i])>=0){
			return false;
		}
	}
	return true
}

function translateQualityError(qualityReturn){
	return ("Denied: it "+((qualityReturn[2])? "contained "+qualityReturn[1] : "did not contain "+qualityReturn[1]));
}

//HEIRARCHY
//max depth - max amount of parents to process, -1 is UNLIMITED!
//current_build - the current tag generated.
//current_depth - seriously?
function resolve_heirarchally(object, max_depth, current_build, current_depth){
	//Does the current build resolve specifically? If so, return that bad boy.
	// Set the 'return best try' flag, for we want a little something more specific than the tag name to go from.
	var current_result = resolve_clicked_object(object, true);
	current_build = current_result[1] + " " +current_build ;
	if(current_result[0] != null && resolves_singular(current_build) ){
		return [1,current_build]
	}else if(current_depth <= max_depth || max_depth == -1){
		return resolve_heirarchally(object.parentNode, max_depth, current_build, current_depth+1);
	}else{
		return [null,current_build];
	}
}

//END HIERARCHY 

function resolve_clicked_object(object, return_best_try){
	var buildup=object.tagName.toLowerCase();
	failure=""
	//Try an ID first
	if(object.id){
		buildup+="#"+object.id
		check=satisfies_selector_quality(buildup);
		if(resolves_singular(buildup)){
			if(check[0]){
				return [1,buildup];
			}else{
				failure=translateQualityError(check);
			}
		}
	}
	//Then try a class
	if($(object)[0].className!=""){ // this looks bad, I know. But it's all SVG's fault, really.
		resolved_class=resolve_best_class($(object)[0].className,object);
		if(resolved_class != ""){
			buildup+=resolved_class
			check=satisfies_selector_quality(buildup);
			if(resolves_singular(buildup)){
				if(check[0]){
					return [1,buildup];
				}else{
					failure=translateQualityError(check);
				}
			}
		}
	}

	//Lets try to use another attribute
	last_chance=resolve_to_any_attr(object,true);

	//Last chance, bitches. 
	check = satisfies_selector_quality(last_chance[1]);
	//Does it blend??
	if(last_chance[0]!=null){
		if(check[0]){
			return [1,last_chance[1]];
		}else{
			failure=translateQualityError(check);
		}
	}
	if(return_best_try != undefined){
		return [null,last_chance[1]];
	}else{
		return [null,failure];
	}
}

function get_base_selector(object){
	selector=object.tagName.toLowerCase();
	if(object.id){
		toAddon="#"+object.id;
		if(isAllowed(toAddon)){
			selector+=toAddon;
		}
	}else if($(object)[0].className!=""&& deniedSymbols.indexOf(".")==-1){
        selector+=resolve_best_class($(object)[0].className,object);
	}
	return selector;
}

function resolve_to_any_attr(object,must_be_unique){
	base=get_base_selector(object);
	$.each(object.attributes, function(i, attrib){
	  if(attrib.name!="class" && attrib.name!="id" && attrib.name!="href"&& attrib.name!="title"){
	  	base+="["+attrib.name+"='"+attrib.value+"']";
		  if(must_be_unique){
		  	if(resolves_singular(base)){
		       return [1,base];
		    }
		     
		   }else{
			   	if($(selector).length>0){
			   		return [1,base];
			   	}
		   } 
		}
  	});
  	return [null,base];
}

function has_momentary_state(selector){
	return (selector.indexOf("hover") != -1);
}

function resolve_best_class(class_in,object){
	if(mode="XPATH"){
		output="";
		if(deniedSymbols.indexOf(".")==-1){
			values=class_in.split(" ");
			for(var i=0;i<values.length;i++){
				if(!has_momentary_state(values[i]) && isAllowed(values[i])){
					output+= "."+values[i];
				}
			}
		}
		return output;
	}else{
		values=class_in.split(" ");
		for(var i=0;i<values.length;i++){
			if(resolves_singular("."+values[i]) && !has_momentary_state(values[i])&& isAllowed(values[i])){
				return "."+values[i];
			}
		}
		num=$("."+values[0]).index($(object));
		if(num<0){
			return("."+values[0]);
		}
		return "";
	}
}

function get_as_index(object,base){
	selector=get_base_selector(object);
	if(base.length > selector.length){
		selector = base;
	}
	num=$(selector).index($(object));
	if(num<0){
		return(selector);
	}
	return(selector+":eq("+num+")");
}

function set_position(posi_array){
	var container = document.getElementById("wayne_daddy");
	result=((posi_array[0]>0)? "w_top ":" ");
	result+=((posi_array[1]>0)? "w_right ":" ");
	result+=((posi_array[2]>0)? "w_bottom ":" ");
	result+=((posi_array[3]>0)? "w_top ":" ");
	container.setAttribute("class", result);
}

function resolves_singular(selector){
	return ($(selector).length==1);
}

function link_text_is_unique(html){
	count=2;
	if(html.length>0){
		returnStatement=true;
		$("a").each(function(){
			if($(this).html()==html){
				count--;
			}
			if(count==0){
				returnStatement=false;
			}
		});
		return returnStatement;
	}else{
		return false
	}
}

function sendEvent(msg){
	chrome.extension.sendMessage(msg);
}

function destroyListeners(killWayne){
	$(document).unbind(".wayne");
	if(killWayne){
		$("*").unbind(".waynecr");
		$("body").children("#wayne_daddy").remove();
	}
	$("*").unbind(".wayne");
	wayneLoaded=false;

}

function loadListeners(loadWayne){
	
	if(!wayneLoaded){
		$("input,textarea").live("blur.wayne",function(){//TextField
			if(!selecting){
				var object = this;
				sendEvent({action: "FieldBlur", target: object.name,value:$(object).val()});
			}
		});

		$('input:file').live('change.wayne',function(event){
			if(!selecting){
				var object = this;
				sendEvent({action: "FileUpload", target: object.name,value:$(object).val()});
			}
		});

		$('input:checkbox').live('change.wayne', function(){
			if(!selecting){
				var object = this;
				if($(this).is(':checked')){
		        	sendEvent({action: "CheckboxCheck", target: object.name, value: $(object).val()});
		    	} else {
		        	sendEvent({action: "CheckboxUnCheck", target: object.name, value: $(object).val()});
		    	}
		    }
		});

		$('select').live('change.wayne', function(){
			if(!selecting){
				var object = this;
				sval=$(object).find("option:selected").html();
				sendEvent({action: "SelectChange", target: object.name, value: sval});
			}
		});

		$('form').live('submit.wayne', function (event){
			if(!selecting){
				var object = event.target;
				//sendEvent({action: "SubmitForm", target: object.id});
			}
		});


		$(document).bind("mouseover.wayne",function(event){
			if(selecting){
				if(event.target.className.indexOf("wayne_") == -1 && event.target.id.indexOf("wayne_") == -1){
					$(event.target).addClass("wayne_hover");
				}
			}
		});

		$(document).bind("mouseout.wayne",function(event){
			if(selecting){
				$(event.target).removeClass("wayne_hover");
			}
		});

		$(document).bind("keydown.wayne",function(event){
			if(selecting && selected_object!=null){
				switch(event.keyCode){
					case 37:
						traverseSelected(selected_object,-1);
						break;
					case 38:
						traverseSelected(selected_object,2);
						break;
					case 39:
						traverseSelected(selected_object,1);
						break;
					case 40:
						traverseSelected(selected_object,-2);
						break;
					case 13: //Enter
						processSelect(selected_object,false);
						break;
					case 27: //Esc
						disableSelectMode();
						break;
					case 61: //+=
						break;
					case 189: //minus
						break;
					case 187: // plus
						break;
					default:
						break;
				}	
			}
		});

		$("input:submit").live('click.wayne', function(){
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
		if(loadWayne){
			lock_ajax=true;
			$("body").append("<div id='wayne_daddy'><div id='wayne_sel_pop'>Counted <b id='wayne_s_c'>0</b> of <strong id='wayne_s_t'>[press enter to finish]</strong></div><div id='wayne_msg_container'><div class='wayne_rt'><b class='wayne_name'>Wayne</b><b id='wayne_count'>(0)</b>: </div><div id='wayne_msg'>Should update.</div><div class='wayne_btns'><b id='wayne_kill' title='finish capture' class='wayne_btn' title='finish capture'>⚐</b><b id='wayne_pause' class='wayne_btn' title='pause/play'>∎</b><b id='wayne_redo' class='wayne_btn' title='redo event'>☞</b><b id='wayne_undo' class='wayne_btn' title='undo event'>☜</b><b id='wayne_select' class='wayne_btn' title='cancel selection'>✖</b></div></div></div>");
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
	

	$(document).bind("click.wayne",function(event) {
		var object=event.target;
		$(object).removeClass("wayne_hover");

		if(object.className.indexOf("wayne_") == -1 && object.id.indexOf("wayne_") == -1){
			if(selecting){
				traverseSelected(object,0);
				last_ts=event.timeStamp;
				return false;
			}else if(event.timeStamp!=last_ts){ // No double taps allowed.
				if(object.tagName.toLowerCase()!="input"){
					if(object.tagName=="IMG" || object.tagName=="I"){
						if(object.parentNode.tagName=="A" || object.parentNode.tagName=="BUTTON"){
							object=object.parentNode;
						}
					}
					return fullProcessClickedObject(object);
				}
			
				
			}
		}

		sendEvent({action:"Wayne",target:"OREOS!? WAYNE ~LOVES~ OREOS!"});
		return true;
	});
	}
}


function traverseSelected(object,direction){
	//-1 Sibling < | 0 Nil | 1 Sibling > | 2 Parent ^ | -2 Child
	switch(direction){
		case -2:
			object = $(object).children().first();
			break;
		case -1: 
			object = $(object).prev();
			break;
		case 1:
			object = $(object).next();
			break;
		case 2:
			object = $(object).parent();
			break;
		default:
			object = $(object);
			break;
	}
	if(object.length==1){
		object=$(object).get(0);
		if(object.tagName!="BODY"){
			if(selected_object!=null){
				$(selected_object).removeClass("wayne_lockon");
			}
			selected_object=object;
			processSelect(selected_object,true);
			$(object).addClass("wayne_lockon");
		}
	}
}

function fullProcessClickedObject(object){
	//result=resolve_clicked_object(object);
	var result=resolve_heirarchally(object,5,"",0);
	var output="";
	var error="";
	if(result[0]!=null){
		output=result[1];
	}else if(allowIndex){
		if(enforce_denied){
			error = translateQualityError(result);
		}else{
			output = get_as_index(object,result[1]);
		}
	}else{
		if(object.tagName=="A" && allowLabelClick){
			if(link_text_is_unique(object.innerHTML)){
				sendEvent({action: "HTMLClick", target: object.innerHTML});
				return true;
			}else{
				error="Element can't be picked without labeling (See options)";
			}
		}else{
			error="Element can't be picked without indexing(See options)";
		}
		
		setHeaderMsg("error",error);
	}
	if(output!=""){
		sendEvent({action: "ElementClick", target: output});
		return true;
	}else if(error!=""){
		setHeaderMsg("error",error);
		return false;
	}else{
		setHeaderMsg("error",translateQualityError(result));
		return false;
	}
}

function enableSelectMode(){
	lock_ajax=true;
	setHeaderMsg("notify","Selecting Assertion Element");
	$("#wayne_select").fadeIn(500);
	selecting=true;
}

function disableSelectMode(){
	selecting=false;
	lock_ajax=false;
	selected_object=null;
    $(".wayne_lockon_assoc").removeClass("wayne_lockon_assoc");
    $(".wayne_lockon").removeClass("wayne_lockon");
	$(".wayne_hover").removeClass("wayne_hover");
	$("#wayne_sel_pop").hide(400);
	$("#wayne_select").fadeOut(567);
}

function updateSelectDisplay(count,tag){
	if($("#wayne_sel_pop").css("display")=="none"){
		$("#wayne_sel_pop").fadeIn(500);
	}
	$("#wayne_s_c").html(count.toString());
	$("#wayne_s_t").html(tag);
}

function setHeaderMsg(type,msg){
	$("#wayne_msg").attr("class","wayne_"+type)
	$("#wayne_msg").html(msg);
}

function startUp(posi){
	if(!running){
		loadListeners(true);
		set_position(posi.split("-"));
	  	$("#wayne_daddy").fadeIn(500);
	}
}



chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) { 
	if (msg.swag == "Stop" || msg.stat=="Stopped"){
	    setHeaderMsg("notify","Stopped!");
	    destroyListeners(true);
	    $("#wayne_daddy").fadeOut(500);
	}else if (msg.swag == "Start"){
		startUp(msg.position);
	    sendEvent({action:"Visit",target:window.location.pathname})
	}else if (msg.swag == "Select"){
	  	if(!selecting){
	  	  enableSelectMode();
	    }
	}else if(msg.swag=="update"){
		if(msg.stat=="Running"){
			startUp(msg.position);
		}
		allowIndex=(msg.allow_index=="1");
		setHeaderMsg("event",msg.update);
		set_position(msg.position.split("-"));
		requiredSymbols=msg.selectors.split(",");
		if(requiredSymbols[0]=="") requiredSymbols=[];
		deniedSymbols=msg.bad_selectors.split(",");
		if(deniedSymbols[0]=="") deniedSymbols=[];
		allowLabelClick=(msg.labelclicks=="1");
		$("#wayne_count").html("("+msg.count+")");
		if(msg.count>1){
			$("#wayne_undo").show();
		}else{
			$("#wayne_undo").hide();
		}
		if(msg.recount>0){
			$("#wayne_redo").show();
		}else{
			$("#wayne_redo").hide();
		}
	}else{

	  	setHeaderMsg("notify",msg);

	}
	
});




	 
