var WayneSocket = {
    sendEvent: function(evt){
        chrome.extension.sendMessage(evt);
    },
    opts: {
        "seek_attrs":[
            "class","id","value"
        ],
        "itest_attrs":[
            "label":{}
        ]
    }
}
//Needs a wrapper for the DOM objects!

function WinDomWrapper (obj) {

    this.active_parent = undefined;
    this.active_child = undefined;
    this.in_factor = false; // Is this a previewed child? Or the real deal.
    this.attr_tracker = {};
    //Like for class, or id, or value... maybe label.. just store attr and the values as a structure.
    this.instantiateAttr = function(attr, value){
       this.attr_tracker[attr]=[];

       if(value != undefined){ // we supply it.
          this.attr_tracker[attr].push([false,value]);
          return;
       }
       if attr=="class" {
            var values = $(this.base).attr(attr).split(" ");
            for(i=0;i<values.length;i++){
                //is used, value
                this.attr_tracker[attr].push([false, values[i]])
            }
       }else{
            this.attr_tracker[attr].push([false,$(this.base).attr(attr)])
       }
    };
    //Add the base and re-render around that
    this.instantiateBase = function(base_obj){
        this.base = base_obj;
        //sweep it for attrs that we can use.
        var tmp_attrs = WayneSocket.opts["seek_attrs"];
        var tmp_jq_base = $(base_obj);
        for(i=0;i<tmp_attrs.length; i++){
            if(tmp_jq_base.attr(tmp_attrs[i])!= undefined){
                this.instantiateAttr(tmp_attrs[i]);
            }
        }

        //literal things

        this.instantiateAttr("_label",tmp_jq_base.html());
        //render a container around this.
    };
    //Add and activate the parent
    this.instantiateParent = function(){
        this.active_parent = WinDomWrapper.new(this.base);
    };
    //Change the base to either it's previous or next sibling
    this.sidestep = function(direction){
        if(direction=="left"){
            this.instantiateBase($(this.base).prev()[0])
        }else{
            this.instantiateBase($(this.base).next()[0])
        }
    };
    
    this.instantiateBase(obj);
}


//Kill listeners on AEC select
//Scope event sends
//Scope high this calls
var Winston = {
    loaded: false,
    do_kill: false,
    lock_ajax: false,
    page_listeners_loaded: false,
    base_loaded: false,
    sel_evts_loaded: false,
    sel_mode: 0, //0-not doing shit, 1-clicking, 2-counting


    initialize: function(){

    },

    destroy: function(){
        $(document).unbind(".wayne");
        
        $("*").unbind(".wayne");
        $("body").children("#winston_box").remove();
    },

    load: function(){
        this.loadPageListeners();
        this.loadWinstonBaseListeners();
    },

    loadPageListeners: function(){
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
        //The money shot.

        $(document).bind("click.wayne",function(event) {
            var object=event.target;
            $(object).removeClass("wayne_hover");
            if(object.className.indexOf("winston_") == -1 && object.id.indexOf("winston_") == -1){
                // Do stuff
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
        Winston.page_listeners_loaded = true;
    },
    destroyPageListeners = function(){
        $(document).unbind(".wayne");
        Winston.page_listeners_loaded = false;
    },
    loadWinstonBaseListeners = function(){
        Winston.lock_ajax=true;
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
        Winston.base_loaded=true;
        Winston.lock_ajax=false;
    },
    destroyWinstonBaseListeners: function(){
        $("*").unbind(".waynecr");
        Winston.base_loaded=true;
    },
    loadSelectEventListeners: function(){
        $(".winston_expander_toggle_parent").on("click.waynesel",function(evt){

        });

        $(".winston_expander_toggle_child").on("click.waynesel",function(evt){

        });

        $(".winston_expander_toggle_parent").on("click.waynesel",function(evt){

        });

        $(".edit_in_place").on("click.waynesel", function(){

        });

        $(".winston_attr_disp").on("click.waynesel",function(){

        });


        Winston.sel_evts_loaded=false;
    },
    destroySelectEventListeners: function(){
        $("*").unbind(".waynesel");
        Winston.sel_evts_loaded=true;
    },

    // Actual stuff.

    //Holds the current stack of objects used to query
    //The active object is always implied at index 0
    currentHeirarchy: [],

    //Add an expander container above current with the clicked element's parent
    addParentLevel: function(){

    }, 

    //Add an expander below current, but just to look it..
    seekChild: function(){

    },
    //Set the upward expander as the clicked object, discard lower expanders.
    traverseUpwards: function(obj){

    },
    //Set the child displayed by seekChild as the current. Keep parents by default.
    traverseDownwards: function(obj, retain_upper){

    },
    //Set an attribute of the element to either be active or inactive in the query
    setAttribute: function(obj, attribute, active){

    },
    //Export the current heirarchy to the extension's client.
    confirmCurrentState: function(){

    }
}

$(document).bind("ready",function(){
    sendEvent({action:"Wayne",target:"Winston! Leave the fucking cat alone!!"});
});