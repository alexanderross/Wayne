//Engine / extension file
var wayneStarted=false;
var lastRecieved=null;
var actions = new Array();
var undidactions= new Array();


var outputVerbage="CAPY";
localStorage["wayne_version_number"]="0.989";
loadDefaults();

function loadDefaults(){

	if (!localStorage["wayne_engine"]){
		localStorage["wayne_engine"]="RACCOON";
	}

	if (!localStorage["wayne_position"]){
		localStorage["wayne_position"]="0-1-1-0";
	}

	if (!localStorage["wayne_technical"]){
		localStorage["wayne_technical"]=1;
	}

	if (!localStorage["wayne_selector"]){
		localStorage["wayne_selector"]="xpath";
	}

	if (!localStorage["wayne_required"]){
		localStorage["wayne_required"]="";
	}

	if (!localStorage["wayne_deny"]){
		localStorage["wayne_deny"]="";
	}

	if(!localStorage["wayne_index_behaviour"]){
		localStorage["wayne_index_behaviour"]="0";
	}

	if(!localStorage["wayne_wait"]){
		localStorage["wayne_wait"]="1";
	}

	if(!localStorage["wayne_allow_label_click"]){
		localStorage["wayne_allow_label_click"]="1";
	}

	if(!localStorage["wayne_do_saved"]){
		localStorage["wayne_do_saved"]="y"
	};

}
if(!localStorage["wayne_saved"]){
	localStorage["wayne_saved"]="[]";
}
function getStorageUsed(){
	return ((localStorage["wayne_saved"].length / 2500000)*100).toFixed(2);
}

function addToSavedCaps(){
	today = new Date();
	storedData=JSON.parse(localStorage["wayne_saved"]);
	storedData.push({"date":(today.getFullYear()+ "/" + today.getMonth() + 1 + "/" + today.getDate()),"time":(today.getHours()+":"+today.getMinutes()),"data":actions});
	localStorage["wayne_saved"]=JSON.stringify(storedData);
	
}

function start(){
	actions = new Array();
	chrome.contextMenus.create({title: "Assert Element Count", contexts:["page"],id:"wayne--elct", onclick: function(info, tab) {
    	sendMessage({swag:"Select"});
	}});

	chrome.contextMenus.create({title: "Assert Selection Exists", contexts:["selection"],id:"wayne--selex", onclick: function(info, tab) {
	    	addEvent(translateEvent({action:"AssertText",target:info.selectionText}));
	    	updateNode();
	}});
	wayneStarted=true;

}

function stop(){
	wayneStarted=false;
	copyToClipboard();
	if(actions.length){
		//alert("Terminated an empty capture.. good job..");
	}else{
		alert(actions.length+" Test items copied to clipboard."+((localStorage["wayne_do_saved"]=="y")?"Save storage "+getStorageUsed()+"% full.":""));
	}
	chrome.contextMenus.remove("wayne--elct");
	chrome.contextMenus.remove("wayne--selex");
}

function updateNode(){
	localStorage["wayne_required"]=localStorage["wayne_required"].replace(/ /g,"");
	sendMessage({swag:"update",stat:((wayneStarted)? "Running" : "Stopped"),update:getLastMsg(),count:actions.length,recount:undidactions.length,position:localStorage["wayne_position"],allow_index:localStorage["wayne_index_behaviour"],selectors:localStorage["wayne_required"],bad_selectors:localStorage["wayne_deny"],labelclicks:localStorage["wayne_allow_label_click"]});
}

function isRepeat(msg){
	if(lastRecieved){
		if(msg==lastRecieved){
			return true;
		}
	}
	return false;
}

function msgToEnglish(msg){
	return msg.action+" -> "+msg.target;
}

function getLastMsg(){
	if(actions.length > 0){
		if(localStorage["wayne_technical"]==1){
			return actions[actions.length-1][1];
		}else{
			return actions[actions.length-1][0];
		}
	}
}

function addEvent(processedEvent){
	if(processedEvent){
		if(processedEvent!=""){
			actions.push(processedEvent);
			undidactions= new Array();
		}
	}
}

function addRedoEvent(){
	redoEvent=undidactions.pop();
	if(redoEvent){
		if(redoEvent!=""){
			actions.push(redoEvent);
			lastRecieved=redoEvent;
		}
	}
}


chrome.extension.onMessage.addListener(function(msg,sender, sendResponse) {
	if(msg.action=="Wayne"){
		if(msg.target=="setevents"){
			actions = msg.values;
		}
		if(msg.target=="undo"){
			if(actions.length>0){
				undidactions.push(actions.pop());
				lastRecieved=actions[actions.length-1];
			}
		}else if(msg.target=="redo"){
			addRedoEvent();
		}else if(msg.target=="kill"){
			wayneStarted=false;
			sendMessage({swag:"Stop"});
			stop();
		}
	}else if(wayneStarted){
		if(msg.action == "Options"){//Should reload active client
			updateNode();
		}
		processed=translateEvent(msg);
	  	if(!isRepeat(processed) && processed!=""){
	  		lastRecieved=processed;
	    	addEvent(processed);
	    }
	}
	updateNode();
});


chrome.browserAction.onClicked.addListener(function(tab) { inject();});

function translateEvent(msg){
	keyword=localStorage["wayne_selector"];
	if(outputVerbage=="CAPY"){
		if(msg.action=="Visit"){
			return ["Visit Page","visit('"+msg.target+"')"];
		}else if(msg.action=="HTMLClick"){
			return ["Click on \'"+msg.target.trim()+"\'","click_link('"+msg.target.trim()+"')"];
		}else if(msg.action=="AssertText"){
			return ["Page has \'"+msg.target+"\'?","assert page.has_content?('"+msg.target+"')"];
		}else if(msg.action=="FieldBlur"){
			return ["Fill in "+msg.target+" with \'"+ msg.value+"\'","fill_in('"+msg.target+"', :with => '"+msg.value+"')"];
		}else if(msg.action=="FileUpload"){
			return ["Attach File","attach_file('"+msg.target+"', '"+msg.value+"')"];
		}else if(msg.action=="CheckboxCheck"){
			return ["Check \'"+msg.target+"\'","check('"+msg.target+"')"];
		}else if(msg.action=="CheckboxUnCheck"){
			return ["Uncheck \'"+msg.target+"\'","uncheck('"+msg.target+"')"];
		}else if(msg.action=="SelectChange"){
			return ["Select \'"+msg.value+"\' from "+msg.target,"select('"+msg.value+"', :from => '"+msg.target+"')"];
		}else if(msg.action=="SubmitClick"){
			return ["Click on \'"+msg.value+"\' button","click_button('"+msg.value+"')"];
		}else{
			msg.target=translateSelector(msg.target);
			if(msg.action=="AssertText"){
				return ["Assert \'"+msg.target+"\' on page","assert page.has_content?('"+msg.target+"')"];
			}else if(msg.action=="AssertUrl"){
				//Why?
			}else if(msg.action=="AssertCount"){
				return ["Assert "+msg.value+" of \'"+msg.target+"\'","assert page.has_"+keyword+"?('"+msg.target+"',:count => '"+msg.value+"')"]; 
			}else if(msg.action== "AssertSingleElement"){
				return ["Assert page has "+msg.target,"assert page.has_css?('"+msg.target+"')"]; 
			}else if(msg.action=="AJAXEvent" && localStorage["wayne_wait"]=="1"){
				return ["Wait","sleep(1)"];
			}else if(msg.action=="ElementClick"){
				if(localStorage["wayne_selector"]=="xpath"){
					return ["Click "+msg.target,"find(:xpath,'"+msg.target+"').click"];
				}else{
					return ["Click "+msg.target,"find('"+msg.target+"').click"];
				}
			}else{
				return "";
			}
		}
	}
}

function translateSelector(cssSelector){
	if(localStorage["wayne_selector"]=="xpath"){
		return convertCSSToXPath(cssSelector);
	}else{
		return cssSelector;
	}
}

// TODO direct descendants - " li a.linkclass" should convert to li/a[@class="linkclass"]
function convertCSSToXPath(cssSelector){
	var xpathoutput=""
	var cssSelector= " "+cssSelector;
	var data=cssSelector.split(/([.:#\[ ])/);
	var current_chunk = "";
	var select_index = -1;
	for(i=0;i<data.length; i++){
		if(data[i]==" "){
			i++;
			if(xpathoutput != ""){
				xpathoutput += "/"
			}
			if(current_chunk != ""){
				xpathoutput += current_chunk
				current_chunk = "";
			}
			current_chunk += data[i];
		}
		if(data[i]=="."){
			if(data[i+1].indexOf(" ") !== -1){
				current_chunk += "[contains(@class,\""+data[i+1]+"\")]";
			}else{
				current_chunk +="[@class=\""+data[i+1];
				while(i+2<data.length && data[i+2]=="."){
					i+=2
					current_chunk +=" "+data[i+1];
				}
				current_chunk +="\"]";
				i++;
			}
		}
		if(data[i]=="#"){
			i++;
			current_chunk +="[@id = \""+data[i]+"\"]";
		}
		if(data[i]==":"){
			i++;
			data[i]=data[i].replace("eq(","");
			if(i == data.length-1){
				select_index = (parseInt(data[i].replace(")",""))+1);
			}else{
				current_chunk +="["+(parseInt(data[i].replace(")",""))+1)+"]";
			}
		}
		if(data[i]=="["){
			i++;
			data[i]=data[i].replace("]","");
			current_chunk +="[@"+data[i]+"]";
		}
	}
	if(select_index != -1){
		xpathoutput = "(//"+xpathoutput+")["+select_index+"]";
	}else{
		if(xpathoutput != ""){
			xpathoutput += "/"
		}
		if(current_chunk != ""){
			xpathoutput += current_chunk;
		}
		xpathoutput = "//"+xpathoutput;
	}
	return xpathoutput;
}

function cleanAcions(){
	for(i=0;i<actions.length; i++){
		actions[i][1]=actions[i][1].replace(/"/g,"\"");
	}
}

function getPureActionArray(index){
	newArray = new Array();
	for(i=0;i<actions.length; i++){
		newArray.push(actions[i][index]);
	}
	return newArray;
}

function copyToClipboard(){
	if(localStorage["wayne_do_saved"]=="y"){
		addToSavedCaps();
	}
    var copyDiv = document.createElement('div');
    copyDiv.contentEditable = true;
    document.body.appendChild(copyDiv);
    copyDiv.innerHTML = getPureActionArray(1).join("<br/>");
    copyDiv.unselectable = "off";
    copyDiv.focus();
    document.execCommand('SelectAll');
    document.execCommand("Copy", false, null);
    document.body.removeChild(copyDiv);
}

function sendMessage(message){
  chrome.tabs.getSelected(null, function(tab) {
  	chrome.tabs.sendMessage(tab.id, message);
  });
}

function inject(){
	if(wayneStarted){
		stop();
		sendMessage({swag:"Stop"});
	}else{
		start();
		sendMessage({swag:"Start", position:localStorage["wayne_position"]});
	}
}




