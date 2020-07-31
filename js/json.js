const _requests = {
    type: "HTTP",
    name: "",
    path: "/a/b",
    method: "POST",
    parameters: [
        /* {
             "name": "abc",
             "value": "abcd"
         },*/
    ],
    headers: [
        /* {
             "name": "Content-Type",
             "value": "json"
         },
         {}*/
    ],
    body: {
        type: "KeyValue",
        raw: "",
        kvs: [
            /*{
                "name": "uid",
                "value": "${uid}"
            },
            {
                "name": "app_id",
                "value": "${app_id}"
            },
            {
                "name": "authen",
                "value": "${authen}"
            },*/
        ]
    },
    assertions: {
        text: [],
        regex: [
            {
                type: "Regex",
                subject: "Response Code",
                expression: "^200$",
                description: "Response Code equals: 200"
            },
        ],
        duration: {
            type: "Duration",
            value: 0
        }
    },
    useEnvironment:true,
}
const _scenarios = {
    name: "xxx",
    variables: [
        {}
    ],
    headers: [
        {}
    ],
    requests: []
}
const _jsonlayout = {
    type: "MS API CONFIG",
    version: "1.1.0",
    scenarios: []
}

class parseJsonLayout {

    _tojson={}


    constructor(data = {}) {
        if (data.length === 0) {
            return
        }
        this.originData = data

        let _json = Object.assign({},_jsonlayout)
        _json.scenarios=[]

        for (let i in this.originData) {
            let s = Object.assign({},_scenarios)
            s.name = i;
            s.requests=[];

            let origin = Object.assign({},this.originData[i])


            for (let j in origin) {
                let r =  Object.assign({},_requests);
                let req = Object.assign({},origin[j]);

                r.name = req.label
                r.path = req.url
                r.method = req.method
                r.headers = req.headers

                for (let z in req.body){
                    r.body.kvs.push({
                        name:z,
                        value: req.body[z]
                    })
                }

                s.requests.push(r)

            }

            _json.scenarios.push(s)
        }
        this._tojson=_json
    }

    parse() {

        return this._tojson
    }
}