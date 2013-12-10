/*BEFORE RUN 
- Instantiate DRRenderer's templates to something



EVENTUALLY
- Dynamic socket opts loading
- Presentations change depending on output subtype (XPATH, CSS, etc.)
*/

var rush_those_listeners = true;
function EventWrapper(object, action_data){
    this.base = object;
    this.evt_data = action_data;
    this.nextEvt = undefined;
    this.prevEvt = undefined;

    this.toString = function(){

    }

    this.setNext = function(evt_obj){
        this.nextEvt = evt_obj;
        ext_obj.prevEvt = this;
    }

    this.setPrev = function(evt_obj){
        this.prevEvt = evt_obj;
        ext_obj.nextEvt = this;
    }

    this.surrender = function(){
        if(this.nextEvt!= undefined){
            this.nextEvt.prevEvt = undefined;
            return this.nextEvt;
        }
    }

    this.addToTail = function(event_obj){
        if(this.nextEvt!= undefined){
            this.nextEvt.addToTail(event_obj);
            return;
        }
        this.setNext(event_obj);
    }
}

var WayneSocket = {
    current_event_id: 0,
    sendEvent: function(evt){
        chrome.extension.sendMessage(evt);
    },
    queueEvent: function(action, target, arg){
        

    },
    loadTemplate: function(template_type){
        
    },
    opts: {
        "seek_attrs":[
            "class","id","value","_label"
        ]
    }
}
var winston_renders = undefined;

//Gets instances from a hopefully initialized collection of template strings
var DRRenderer = {
   
    // What we present these to the user as. <> is replaced by a var. A presentation with one of these, expects one input.
    presentations:{
        "class": ".<>",
        "id": "#<>",
        "_label": "<>",
        "_eq": ":eq(<>)",
        "_default": "[<>='<>']"
    },
    // Same as above, though these are
    engine_executions:{ //What is actually used to get counts.
        "class": ".<>",
        "id": "#<>",
        "_label": ":contains('<>')",
        "_eq": ":eq(<>)",
        "_default": "[<>='<>']"
    },
    windom_execution: " ", // spaces between heirarchal selects, can switch to '/' for xpath. But why?
    //candidate = JQ object
    //Check to see if we can click this by label
    getValidLabel: function(candidate){
        candidate = candidate[0];
        //Actually exists.
        var label_txt= ""
        if(candidate){
            var label_txt= "";
            for(var i=0; i< candidate.childNodes.length; i++){
                if(candidate.childNodes[i].tagName == undefined){
                    label_txt += candidate.childNodes[i].data
                }
            }
            return label_txt
        }
        return "";
    },
    truncateStr: function(input, limit){
        var new_str = input;
        if(input.length > limit){
            var portion = Math.floor(limit/2)-2;
            new_str = new_str.substr(0, portion)+" .. " + new_str.substr(new_str.length - portion );
        }
        return new_str;
    },
   decorateAttrComp: function(template, attr_name){
        //Add the presentation
        var presenter = DRRenderer.presentations[attr_name];
        if(presenter == undefined){
            presenter = DRRenderer.presentations["_default"].split("<>"); 
            if(presenter.length == 3){ //Pretty much the case most of the time unless default is redefined
                presenter[0] = presenter[0]+attr_name+presenter[1];
                presenter[1] = presenter[2];
            }
        }else{
            presenter = presenter.split("<>"); 
        }
        if(presenter[0] != "") template.find(".wad_head").html(presenter[0]);
        if(presenter[1] != "") template.find(".wad_tail").html(presenter[1]);
        return template;
   },
   getNewBase: function(base_obj){
    var template = winston_renders["main"];
    return $(DRRenderer.prepTemplateWithWildcards(template, []));
   },
   getNewDomExpander: function(obj){
    var template = winston_renders["expander"];
    var wildcards = [["dom_tag", obj[0].tagName]]
    return $(DRRenderer.prepTemplateWithWildcards(template, wildcards));
   },
   getNewExpanderAttrComp: function(attr_comp_val){
    var template = winston_renders["expander_attr_comp"];


    return $(DRRenderer.prepTemplateWithWildcards(template, [["atr_value", DRRenderer.truncateStr(attr_comp_val,16)]]));
   },
   getNewExpanderAttr: function(attr){
    var template = winston_renders["expander_attr"];
    return $(DRRenderer.prepTemplateWithWildcards(template, [["type", attr]]));
   },
   getExpanderAttrDelimiter: function(attr_name){
    return DRRenderer.delimiters[attr_name];
   },
   //Replace wildcards with actual stuff.
   prepTemplateWithWildcards: function(template_str, wildcards){
        for(var i=0;i<wildcards.length;i++){
            template_str = template_str.replace(new RegExp('@'+wildcards[i][0]+'@',"g"),wildcards[i][1]);
        }
        return template_str;
   }
}
//Needs a wrapper for the DOM objects!

function WinDomAttrWrapper(parent_wrapper, attr, value_in){
    this.attr_name = undefined;
    this.display_block = undefined;
    this.attr_states = [];
    this.parent_wrapper = undefined;

    this.toggle_active = function(target, index){
        this.attr_states[index][0] = !this.attr_states[index][0];
        target = this.display_block.find(".winston_attr_comp_wrap:eq("+index+")");
        if(this.attr_states[index][0]){
            target.addClass("winston_active_attr");
        }else{
            target.removeClass("winston_active_attr");
        }
        Winston.refreshActive(true);

        //Refresh count
    };

    this.renderWrapper = function(){
        if(this.display_block == undefined){
            this.display_block = DRRenderer.getNewExpanderAttr(this.attr_name);
        }
        //Go through all of the states, render each of them, add class if active.
        var myself = this;
        for(var k=0; k < this.attr_states.length; k++){
            (function(k, myself){
                var new_component = DRRenderer.getNewExpanderAttrComp(myself.attr_states[k][1]);
                myself.display_block.append(new_component);
                //add the before/after swag
                DRRenderer.decorateAttrComp(new_component,myself.attr_name);

                //add a toggle listener.. may need to revisit this for efficiency
                new_component.click(function(evt){
                    myself.toggle_active(new_component, k);
                });

                if(myself.attr_states[k][0]) new_component.addClass("winston_active_attr");
            })(k,myself);
        }

        return this.display_block;
    };

    this.to_tag = function(){
        var output = "";
        var class_builder = DRRenderer.engine_executions[this.attr_name];
        if(class_builder == undefined){
            class_builder = DRRenderer.engine_executions["_default"].split("<>");
            if(class_builder.length == 3){
                class_builder[0] = class_builder[0]+this.attr_name+class_builder[1];
                class_builder[1] = class_builder[2];
            }
        }else{
            class_builder = class_builder.split("<>");
        }
        for(var i = 0; i < this.attr_states.length; i++){
            if(this.attr_states[i][0]){
                output+= class_builder[0]+this.attr_states[i][1]+class_builder[1];
            }
        }
        return output;
    };

    //Like for class, or id, or value... maybe label.. just store attr and the values as a structure.
    this.instantiateWrapper = function(parent_wrapper, attr, value){
        this.parent_wrapper = parent_wrapper;
        this.attr_name = attr;
       if(attr=="class"){
            var values = value.split(" ");
            for(var i=0;i<values.length;i++){
                //is used, value
                this.attr_states.push([false, values[i]])
            }
       }else{
            this.attr_states.push([false, value])
       }
    };
    //Initializer.. purdy much..
    this.instantiateWrapper(parent_wrapper, attr, value_in);
}

function WinDomWrapper (obj, parent_wrap, child_wrap) {

    this.wrapper_id = "STATIC";
    this.display_block = undefined;
    this.in_factor = false; // Is this a previewed child? Or the real deal.
    this.attr_tracker = {};
    this.display_block = undefined;
    this.base = undefined;
    this.current_length = 0;

    //RENDERING

    //Render the entire state of the dom wrapper, namely it's attrs
    this.renderWrapper = function(){
        if(this.display_block == undefined){
            this.display_block = DRRenderer.getNewDomExpander(this.base);
        }
        var focus_dom = this.display_block.find(".winston_expander_criteria");
        focus_dom.remove(".winston_criteria_sel"); //Remove rendered criteria.

        for(var attr_name in this.attr_tracker){
            focus_dom.append(this.attr_tracker[attr_name].renderWrapper());
        }
        var myself = this;
        this.display_block.find(".winston_expander_toggle_parent").click(function(){
            myself.addParent();
        });
        this.refresh();
        return this.display_block;
    };
    //render the current evaluation of the extension.
    this.renderCount = function(count){
        var ct_disp_block = this.display_block.find(".winston_expander_count")
        ct_disp_block.html(this.current_length);
        //If ! selecting, does it resolve singularly? 
        if(Winston.selecting || this.current_length == 1){
            ct_disp_block.addClass("winston_select_count_valid");
        }else{
            ct_disp_block.removeClass("winston_select_count_valid");
        }
    };

    this.addAttribute = function(attribute, value){
        this.attr_tracker[attribute] = new WinDomAttrWrapper(this, attribute, value);
    };

    //Add the expander and re-render around that
    this.instantiateWrapper = function(base_obj, parent_wrap, child_wrap){
        this.active_parent = parent_wrap;
        this.passive_child = child_wrap;
        this.base = $(base_obj);

        this.display_block = DRRenderer.getNewDomExpander(this.base);
        //sweep it for attrs that we can use.
        var tmp_attrs = WayneSocket.opts["seek_attrs"];
        for(var i=0;i<tmp_attrs.length; i++){
            if(this.base.attr(tmp_attrs[i])!= undefined){
                if(this.base.attr(tmp_attrs[i])!=""){
                    this.addAttribute(tmp_attrs[i] , this.base.attr(tmp_attrs[i]));
                }
            }
        }
        // For label selects
        var label_content = DRRenderer.getValidLabel(this.base);
        if(label_content != ""){
            this.addAttribute("_label",label_content);
        }
    };
    //Must be called on lowest node
    this.to_tag = function(){
        var self_obj = this;
        var content = "";
        if(self_obj.active_parent != undefined){
            content = self_obj.active_parent.to_tag() + DRRenderer.windom_execution;
        }
        content += self_obj.base[0].tagName;

        for(var attr_name in self_obj.attr_tracker){
            content += self_obj.attr_tracker[attr_name].to_tag();
        }
        return content;
    };

    this.refresh = function(render_upwards){
        this.current_length = $(this.to_tag()).length;
        this.renderCount();
        if(render_upwards && this.active_parent!=undefined){
            this.active_parent.refresh(true);
        }
    };

    //NODEISH OPS----------

    //Add and activate the parent
    this.addParent = function(){
        this.active_parent = new WinDomWrapper(this.base.parent(), undefined, this);
        this.display_block.before(this.active_parent.renderWrapper());
        this.refresh(false);
    };

    this.toParent = function(){
        if(this.base.children().length != 0) this.instantiateWrapper(this.base.firstChild()[0]);
        this.renderWrapper();
    };
    this.toFirstChild = function(){
        if(this.base.children().length != 0) this.instantiateWrapper(this.base.firstChild()[0]);
        this.renderWrapper();
    };
    this.toRight = function(){
        if(this.base.next().length != 0) this.instantiateWrapper(this.base.next()[0], this.active_parent);
        this.renderWrapper();
    };
    this.toLeft = function(){
        if(this.base.prev().length != 0) this.instantiateWrapper(this.base.prev()[0], this.active_parent);
         this.renderWrapper();
    };
    
    this.instantiateWrapper(obj, parent_wrap, child_wrap);
}


//Kill listeners on AEC select
//Scope event sends
//Scope high this calls
var Winston = {
    loaded: false,
    use_dom_keys: false,
    do_kill: false,
    lock_ajax: false,
    page_listeners_loaded: false,
    base_loaded: false,
    display_block: undefined,
    sel_mode: 0, //0-not doing shit, 1-clicking, 2-counting
    active_expander: undefined,
    active_deferred_event: undefined,
    event_active: false,

    destroyAll: function(){
        $(document).unbind(".wayne");
        Winston.destroyPageListeners();
        Winston.destroyWinstonBaseListeners();
        Winston.destroyDomTraversalKeys();
        Winston.destroySelectEventListeners();
        $("*").unbind(".wayne");
        $("body").children("#winston_box").fadeOut(500).remove();
        Winston.loaded= false;
    },

    loadAll: function(just_listeners){
        if(Winston.loaded) return;
        if(just_listeners == true || just_listeners == undefined){
            this.display_block = DRRenderer.getNewBase();
            $("body").append(this.display_block);
        }
        this.loadPageListeners();
        this.loadWinstonBaseListeners();
        Winston.loaded = true;
    },

    loadWrapper: function( wrapper){
        if(wrapper == undefined) return;
        if(this.active_expander != undefined){
            Winston.destroyCurrentExpander();
        }
        this.sel_mode = 1;
        this.active_expander = wrapper;
        this.active_expander.base.addClass("winston_selected_dom_element");
        this.display_block.find("#winston_expand_container").append(wrapper.renderWrapper());
    },
    //obj is native JS
    loadObject: function(obj){
        if(obj == undefined) return;
        Winston.loadWrapper(new WinDomWrapper(obj));
    },

    loadEvent: function(event_obj){
        Winston.loadObject(event_obj)
    },

    destroyCurrentExpander: function(){
        this.display_block.find(".winston_expander").remove();
        $(".winston_selected_dom_element").removeClass("winston_selected_dom_element");
        this.active_expander = undefined;
        //this.releaseEvents();
        this.sel_mode = 0;
    },

    toggleDomKeys: function(){
        Winston.use_dom_keys = !Winston.use_dom_keys;
        var dk_obj = $(document.getElementById("winston_keys"));
        if(Winston.use_dom_keys){
            dk_obj.addClass("winston_base_option_active");
            Winston.loadDomTraversalKeys();
        }else{
            dk_obj.removeClass("winston_base_option_active");
            Winston.destroyDomTraversalKeys();
        }
    },

    //EVENT QUEUEING
    // If it's something like a submit/link click, we want to pause execution of redirection until the user
    // can work out how they want to resolve the node that triggered the event. We hold this until the expander is confirmed and
    // release is fired. 
    // dethroneHead should load the event into the focus wrapper.
    // destroyCurrentExpander should fire it. 
    //Release paused event listener chain
    activateHead:function(){
        //We need to signify that the deferred event needs to be notified when this event is confirmed.
        Winston.loadObject(Winston.active_deferred_event.base);
        Winston.event_active = true;
    },
    deleteHead: function(){
        Winston.active_deferred_event = Winston.active_deferred_event.surrender();
    },
    //Add the rest of an event chain until the event is resolved.
    queueEvent:function(evt_obj){
        if(Winston.active_deferred_event != undefined){
            Winston.active_deferred_event.addToTail(evt_obj)
        }else{
            Winston.active_deferred_event = evt_obj;
        }
        if(Winston.active_expander == undefined){
            Winston.activateHead();
        }
    },

    //LISTENERS

    loadPageListeners: function(){
        $(document).on("blur.wayne",function(){//TextField
            //WayneSocket.queueEvent(WayneSocket.eventForAction("FieldBlur",this));
            WayneSocket.sendEvent({action: "FieldBlur", target: this.name,value:$(this).val()});
        });

        $(document).on('change.wayne', 'input[type="file"]',function(event){
            //WayneSocket.queueEvent(WayneSocket.eventForAction("FileUpload",this));
            WayneSocket.sendEvent({action: "FileUpload", target: this.name,value:$(this).val()});
        });

        $(document).on('change.wayne', function(){
            if($(this).is(':checked')){
                //WayneSocket.queueEvent(WayneSocket.eventForAction("CheckboxCheck",this));
                WayneSocket.sendEvent({action: "CheckboxCheck", target: object.name, value: $(object).val()});
            } else {
                //WayneSocket.queueEvent(WayneSocket.eventForAction("CheckboxUnCheck",this));
                WayneSocket.sendEvent({action: "CheckboxUnCheck", target: object.name, value: $(object).val()});
            }
        });

        $(document).on('change.wayne', function(){
            var sval = $(object).find("option:selected").html();
            WayneSocket.sendEvent({action: "SelectChange", target: this.name, value: sval});
            //WayneSocket.queueEvent(WayneSocket.eventForAction("SelectChange",this, sval));
        });

        $(document).on('submit.wayne', function (event){
            //sendEvent({action: "SubmitForm", target: object.id});

        });

        $(document).on("mouseover.wayne",function(event){
            if(event.target.className.indexOf("winston_") == -1 && event.target.id.indexOf("winston_") == -1){
                $(event.target).addClass("winston_hover");
            }
        });

        $(document).on("mouseout.wayne",function(event){
                $(event.target).removeClass("winston_hover");
        });
        // left here
        $(document).bind("mouseover.wayne",function(event){
            if(event.target.className.indexOf("winston_") == -1 && event.target.id.indexOf("winston_") == -1){
                    $(event.target).addClass("winston_hover");
            }
        });

        $(document).on("mouseout.wayne",function(event){
            $(event.target).removeClass("winston_hover");
        });

        $(document).on('click.wayne', "input:submit", function(){
                if(!selecting){
                        var object = this;
                        if(allowLabelClick){
                                WayneSocket.sendEvent({action: "SubmitClick", target: object.name, value: $(object).val()});
                                return true;
                        }else{
                                return fullProcessClickedObject(object);
                        }
                }else{
                        return false;
                }
        });
        //The money shot.

        $(document).on("click.wayne",function(event) {
            var object=event.target;
            $(object).removeClass("winston_hover");
            if(object.className.indexOf("winston_") == -1 && object.id.indexOf("winston_") == -1){
                Winston.loadObject(event.target);
            }
        });

        Winston.page_listeners_loaded = true;
    },
    destroyPageListeners: function(){
        $(document).unbind(".wayne");
        Winston.page_listeners_loaded = false;
    },
    loadWinstonBaseListeners: function(){
        Winston.lock_ajax=true;
        var common_container = $(document.getElementById("winston_box"));
        common_container.on('click.waynecr', "#winston_base_back",function(){
                WayneSocket.sendEvent({action:"Wayne",target:"undo"});
                return false;
        });

        common_container.on('click.waynecr',"#winston_base_forward",function(){
                WayneSocket.sendEvent({action:"Wayne",target:"redo"});
                return false;
        });

        common_container.on('click.waynecr',"#winston_base_kill" ,function(){
                WayneSocket.sendEvent({action: "Wayne", target: "kill"});
                return false;
        });

        common_container.on('click.waynecr', "#wayne_base_pause",function(){
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

        common_container.on('click.waynecr',"#wayne_select",function(){
                if(selecting){
                        disableSelectMode();
                        setHeaderMsg("notify","Canceled Element Selection");
                }
                return false;
        });
        common_container.on('click.waynecr',"#winston_keys",function(){
            Winston.toggleDomKeys();
        });

        //Clicking the count to confirm the action.
        common_container.on('click.waynecr',".winston_select_count.winston_select_count_valid", function(){
            Winston.confirmCurrentState();
        });
        console.log("Winston: Base Loaded");
        Winston.base_loaded=true;
        Winston.lock_ajax=false;
    },
    destroyWinstonBaseListeners: function(){
        $("*").unbind(".waynecr");
        Winston.base_loaded=false;
    },
    loadSelectEventListeners: function(){
        Winston.sel_evts_loaded=false;
    },
    destroySelectEventListeners: function(){
        $("*").unbind(".waynesel");
        Winston.sel_evts_loaded=false;
    },

    loadDomTraversalKeys: function(){
        if(!Winston.use_dom_keys) return;
        $(document).on("keydown.winstondomkey",function(event){
            switch(event.keyCode){
                case 37: //left arrow
                    Winston.traverseLeft();
                    break;
                case 38: // up arrow
                    Winston.traverseUpwards();
                    break;
                case 39: // Right arrow
                    Winston.traverseRight();
                    break;
                case 40: // Down arrow
                    Winston.traverseDownwards();
                    break;
                case 13: //Enter
                    Winston.confirmCurrentState();
                    break;
                default:
                        break;
            }        
            
        });
        Winston.dk_evts_loaded=true;
    },

    destroyDomTraversalKeys: function(){
        $("*").unbind(".winstondomkey");
        Winston.dk_evts_loaded=false;
    },

    // Actual stuff=========
    //Select
    selecting: false,
    startSelectSequence: function(){
        if(Winston.selecting) return;
        Winston.selecting = true;
        Winston.sel_mode = 2;
        Winston.loadSelectEventListeners();
    },

    endSelectSequence: function(){
        Winston.selecting = false;
        Winston.sel_mode = 0;
        Winston.destroySelectEventListeners();
    },

    //Add an expander container above current with the clicked element's parent
    gotoParentLevel: function(){
        this.active_expander = Winston.active_expander.activate_parent();
        this.active_expander.disownChild();
    }, 

    //Add an expander below current, but just to look it..
    traverseLeft: function(){
        Winston.loadObject(Winston.active_expander.base.prev()[0]);
    },
    traverseRight: function(){
        Winston.loadObject(Winston.active_expander.base.next()[0]);
    },
    //Set the upward expander as the clicked object, discard lower expanders.
    traverseUpwards: function(){
        Winston.loadObject(Winston.active_expander.base.parent()[0]);
    },
    //Set the child displayed by seekChild as the current. Keep parents by default.
    traverseDownwards: function(obj, retain_upper){
        Winston.loadObject(Winston.active_expander.base[0].childNodes[0]);
    },
    refreshActive: function(){
        Winston.active_expander.refresh(true);
    },
    //Set an attribute of the element to either be active or inactive in the query
    setAttribute: function(obj, attribute, active){

    },
    //Export the current heirarchy to the extension's client.
    confirmCurrentState: function(){
        if(Winston.sel_mode == 0){ // Not doing shit
            return;
        }else if(Winston.sel_mode == 1){ // Clicking
            WayneSocket.sendEvent({action: "ElementClick", target: Winston.active_expander.to_tag()});
        }else{ //Selecting
            WayneSocket.sendEvent({action: "AssertCount", target: Winston.active_expander.to_tag(), value: Winston.active_expander.current_length });
        }
        Winston.destroyCurrentExpander();
    },

    //Response handlers
    processMessage: function(type, content){
        var msg_window =  document.getElementById("winston_message_display");
        if(msg_window != undefined) msg_window.innerHTML = content;
    },

    processUpdate: function(msg){
        if(msg.stat=="Running"){
            Winston.loadAll();
        }
        Winston.processMessage("event",msg.update);
    }
}
var active_engine = Winston;
if(rush_those_listeners){
    Winston.loadPageListeners();
}
$(document).bind("ready",function(){
    //This needs to see everything. so it's down here.
    chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) { 
        if (msg.swag == "settings"){
            winston_renders = msg.templates;
            console.log("Templates Loaded");
            WayneSocket.sendEvent({action:"Wayne",target:"Winston! Leave the fucking cat alone!!"});
        }
        if (msg.swag == "Stop" || msg.stat=="Stopped"){
            active_engine.processMessage("notify","Stopped!");
            active_engine.destroyAll();
        }else if (msg.swag == "Start"){
            active_engine.loadAll();
            WayneSocket.sendEvent({action:"Visit",target:window.location.pathname})
        }else if (msg.swag == "Select"){
            active_engine.startSelectSequence();
        }else if(msg.swag=="update"){
            active_engine.processUpdate(msg)
        }else{

            active_engine.processMessage("notify",msg);

        }
        
    });

    WayneSocket.sendEvent({action:"Winston",target:"load_templates"});
});