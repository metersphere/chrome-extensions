/*
 * Copyright 2017 SideeX committers
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */


var commandTd=["addSelection","answerOnNextPrompt","assertAlert","assertConfirmation","assertPrompt","assertText","assertTitle","assertValue","chooseCancelOnNextConfirmation","chooseCancelOnNextPrompt","chooseOkOnNextConfirmation","clickAt","close" ,"dragAndDropToObject","doubleClickAt","echo","editContent","mouseDownAt","mouseMoveAt","mouseOut","mouseOver","mouseUpAt","open","pause","removeSelection","runScript","select","selectFrame","selectWindow","sendKeys","store","storeEval","storeText","storeTitle","storeValue","submit","type","verifyText","verifyTitle","verifyValue"];


var targetTd=["A locator of a multi-select box","The string to be set to the next prompt pop-up","The expected alert message","The expected confirmation message",
"The expected prompt message","A locator","The expected string of the title (Exact matching). Variable declared in the storeXXX commands can be used in the string. For example: \"Hello ${var_usr}\"","A locator",
"X","X","X","A locator",
"Auto-generated","The locator of the element to be dragged","A locator","The string to be printed in the log console. Variable declared in the storeXXX commands can be used in the string. For example: \"Hello ${var_usr}\"",
"A locator","A locator","A locator","A locator","A locator","A locator",
"A URL","X","A locator of a multi-select box","The Javascript code to be run. For example: \"var a=10; var b=10; console.log(a+b);\"NOTE THAT: Avoid using alert(), prompt(), and confirm(). These three functions will not take effect while running. Please use console.log() to log messages instead.",
"A locator of a drop-down menu","\"index=0\" (Select the first frame of index 0)\"relative=parent\" (Select the parent frame)\"relative=top\" (Select the top frame)","Auto-generated","A locator",
"A string to store","A JavaScript expression, variable, statement, or sequence of statements.\For example: \"x=2; y=3; z = Math.max(x,y);\". The statements will be evaluated to 3 that will be stored in the variable declared in this command's value, say ret.","A locator","The title to store (auto-generated)","A locator",
"A locator for the form to be submitted","A locator","A locator","The expected string of the title (Exact matching). The next command will still be run even if the text verification fails. Variable declared in the storeXXX commands can be used in the string. For example: \"Hello ${var_usr}\"","A locator"];


var valueTd=["An option locator of the element to be added. For example: \"label=Option1\"","X","X","X",
"X","The expected text of the target element (Exact matching). Variable declared in the storeXXX commands can be used in the string. For example: \"Hello ${var_usr}\"","X","The expected value of the target element (Exact matching).\
Variable declared in the storeXXX commands can be used in the value. For example: \"Hello ${var_usr}\"","X",
"X","X","x,y position of the mouse event relative to the target element. For example: \"10,10\". The value can left blank to denote a simple click.","X","The locator of the element on which the target element is dropped",
"x,y position of the mouse event relative to the target element. For example: \"10,10\". The value can left blank to denote a simple double click.","X","The string to be set to the content of the target element with attribute contenteditable=\"true\"","x,y position of the mouse event relative to the target element. For example: \"10,10\"",
"x,y position of the mouse event relative to the target element. For example: \"10,10\"","X","X","x,y position of the mouse event relative to the target element. For example: \"10,10\"",
"X","The amount of time to sleep in millisecond. For example: \"5000\" means sleep for 5 seconds.","An option locator of the element to be removed. For example: \"label=Option1\"","X",
"An option locator. For example: \"label=Option1\"","X","X","A character. For example: \"${KEY_DOWN}\"",
"The name of the variable storing the string. For example: \"var_usr\"","The name of the variable storing the completion value of evaluating the given code.\
For example: \"ret\".","The name of the variable storing the text of the target element. For example: \"var_ele_txt\"","The name of the variable storing the title. For example: \"var_title\""," 	The name of the variable storing the value of the target element. For example: \"var_ele_value\"","X","The string to be set to an input field.",
"The expected text of the target element (Exact matching). The next command will still be run even if the text verification fails. Variable declared in the storeXXX commands can be used in the string. For example: \"Hello ${var_usr}\"","X","The expected value of the target element (Exact matching). The next command will still be run even if the text verification fails.\Variable declared in the storeXXX commands can be used in the value. For example: \"Hello ${var_usr}\""];




function searchCommand(word,command){
   var index=0; 
    for(index;index<command.length;index++){
        if(word==command[index]){
            return index;
        }
    }
    //Not found
    return -1;
}
function scrape(word){
    
            

    wordPosition=searchCommand(word,commandTd);
        emptyNode(document.getElementById("refercontainer"));
       
        if(wordPosition!=-1){
            if(targetTd[wordPosition]=="X")
                targetTd[wordPosition]="Left blank";
            if(valueTd[wordPosition]=="X")
                valueTd[wordPosition]="Left blank";
            help_log.log("Command: "+word);
            help_log.log("Target: "+targetTd[wordPosition]);
            help_log.log("Value: " +valueTd[wordPosition]);
        }
        else{
            help_log.log("Command not found");
        }        


}
