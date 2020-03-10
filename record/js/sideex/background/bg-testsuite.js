class TestSuite{
    constructor(name){
        this.suite_name = name;
        this.test_cases = [{testStep: "Test", commands: []}];
        this.observers = [];
    }
    getTestCase(testCase){
        return this.test_cases[testCase];
    }
    getTestCaseName(testCase){
        return this.test_cases[testCase].testStep;
    }
    getLastTestCaseIndex(){
        return this.test_cases.length - 1;
    }
    getSteps(testCase){
        return this.test_cases[testCase].commands;
    }
    addNewTestCase(name){
        var new_testCase = {};
        new_testCase.testStep = name;
        new_testCase.commands = [];
        this.test_cases.push(new_testCase);
        this.notifyObservers('addTestCase', {testCaseIndex: this.test_cases.length-1});
    }
    addCommand(testCaseIndex, commandIndex, command){
        if(commandIndex >= this.test_cases[testCaseIndex].commands.length){
            //console.log("addCommandAtIndex: Pushing command");
            this.test_cases[testCaseIndex].commands.push(command);
        }
        else{
            //console.log("addCommandAtIndex: Splicing command");
            this.test_cases[testCaseIndex].commands.splice(commandIndex, 0, command);
        }
        this.notifyObservers('addCommand', {testCaseIndex: testCaseIndex, commandIndex: commandIndex});
    }
    addTestCase(testCaseIndex, testCase){
        if(testCaseIndex >= this.test_cases.length){
            //console.log("addTestCaseAtIndex: Pushing command");
            this.test_cases.push(testCase);
        }
        else{
            //console.log("addTestCaseAtIndex: Splicing command");
            this.test_cases.splice(testCaseIndex, 0, testCase);
        }
        this.notifyObservers('addTestCase', {testCaseIndex: testCaseIndex});
    }

    assignDomToCommand(testCaseIndex, commandIndex, dom) {
        this.test_cases[testCaseIndex].commands[commandIndex].recordedDom = dom;
        this.notifyObservers('assignDomToCommand', {testCaseIndex:testCaseIndex, commandIndex:commandIndex});
    }

    /**
     *
     * @param {string} id - identifier of screenshot
     * @param {string} image - image for the screenshot in base64
     */
    addScreenshot(id, image) {
        for (const testCase of this.test_cases) {
            for (const cmd of testCase.commands) {
                if (cmd.attributes && cmd.attributes['recordId'] === id) {
                    cmd.attributes['screenshot'] = image;
                    delete cmd.attributes['recordId'];
                    return;
                }
            }
        }
    }

    deleteTestCase(testCaseIndex){
        this.test_cases.splice(testCaseIndex, 1);
        this.notifyObservers('deleteTestCase', {testCaseIndex: testCaseIndex});
    }
    deleteCommmand(testCaseIndex, commandIndex){
        this.test_cases[testCaseIndex].commands.splice(commandIndex, 1);
        this.notifyObservers('deleteCommand', {testCaseIndex: testCaseIndex, commandIndex: commandIndex});
    }

    updateTestCaseName(testCase, name){
        this.test_cases[testCase].testStep = name;
        this.notifyObservers('updateTestCaseName', {testCaseIndex: testCase});
    }
    updateTestCases(testCases){
        this.test_cases = testCases;
        this.notifyObservers();
    }
    updateCommand(testCaseIndex, commandIndex, command){
        this.test_cases[testCaseIndex].commands[commandIndex] = command;
        this.notifyObservers('updateCommand', {testCaseIndex:testCaseIndex, commandIndex:commandIndex});
    }
    updateCommandProperty(testCaseIndex, commandIndex, commandProperty, value){
        this.test_cases[testCaseIndex].commands[commandIndex][commandProperty] = value;
        this.notifyObservers('updateCommandProperty', {testCaseIndex:testCaseIndex, commandIndex:commandIndex, commandProperty: commandProperty});
    }
    updateCommandIndex(testCaseIndex, commandFromIndex, commandToIndex){
        this.test_cases[testCaseIndex].commands.splice(commandToIndex, 0, this.test_cases[testCaseIndex].commands.splice(commandFromIndex, 1)[0]);
        this.notifyObservers('updateCommandIndex', {testCaseIndex: testCaseIndex, commandFromIndex: commandFromIndex, commandToIndex:commandToIndex});
    }

    exportJSON() {
        var json = {};
        json.suite_name= this.suite_name;
        json.test_cases = this.test_cases;
        return json;
    }

    loadSuiteJSON(json){
        this.suite_name = json.suite_name;
        this.test_cases = json.test_cases;
    }

    addObserver(tab){
        for (let i = 0; i < this.observers.length; i++) {
            if (this.observers[i].id === tab.id) {
                return false;
            }
        }
        this.observers.push(tab);
    }

    removeObserver(id){
        let targetObserverIndex;
        for (let i=0; i<this.observers.length; i++){
            if(this.observers[i].id === id){
                targetObserverIndex = i;
            }
        }
        if(targetObserverIndex){
            this.observers.splice(targetObserverIndex, 1);
        }
        else {
            //console.log("TEST SUITE: Observer with id: " + id + "not found.");
        }
    }
    notifyObservers(action,indexes){
        //console.log("TEST SUITE: Attempting to notify observers: ");
        //console.log(this.observers);
        let notified = [];
        let options = {
            action: action,
            indexes: indexes,
        };
        for (let i=0; i<this.observers.length; i++){
            if(notified.indexOf(this.observers[i].id) === -1){
                browser.tabs.sendMessage(this.observers[i].id,{command:"testSuiteNotification", observable: this, options:options}).catch((reason)=>{
                });
                notified.push(this.observers[i].id);
            }
            else{
                //console.log("Observer: " + this.observers[i].id + " already notified");
            }
        }
        //console.log("Observers notified: ");
        //console.log(notified);
    }
    clearObservers(){
        this.observers = [];
    }
}
