var http = require('https');
var mail = require('./mail');

var userId = 0;
var isFinish = false;
var errorCount = 0;
var successPeople = [];
var People = [];
var ids = [];
var problemIds = [];
var startIndex = 0;
var page = 0;
var count = 100;
var nextPersonIndex = 0 ;
var problemIterationCount = 0;
var linearNumber = 1;
var invNote = "";
var keywords = "";
var controlList = [];

var mainresponse = null;
var responsemessage = "";


var host = "www.linkedin.com";
var headers = {
    'cookie': '',
    'csrf-token': ''
};

function CreateOption(method){
    var clist =  '';
    if(method == 'GET' && controlList.length > 0){
        clist = ',facetIndustry-%3E'+ controlList[0] 
        for (var i = 1; i < controlList.length; i++) {
            var element = controlList[i];
            clist += '%7C'+ controlList[i]
        }
    }
    return {
        host: host,
        method: method,
        path: method == 'GET' ?
         'https://www.linkedin.com/voyager/api/search/cluster?count='+ count
          +'&guides=List(v-%3EPEOPLE,facetGeoRegion-%3Etr%3A0,facetNetwork-%3EO'+ clist +keywords+')&origin=GLOBAL_SEARCH_HEADER&q=guided&start='+ startIndex //'/voyager/api/relationships/peopleYouMayKnow?start='+ (startIndex*10).toString() +'&usageContext=d_flagship3_people'
         : '/voyager/api/growth/normInvitations', // '/voyager/api/identity/profiles/'+ publicIdentifier +'/profileView'
        headers: headers
      };
}


function FetchNextData(){
    if((People.length-1) >= nextPersonIndex){
        SendData(People[nextPersonIndex]);
    }
    else{
        responsemessage += 'end='+  GetNow() +
        '\nTotal Count=' + People.length.toString() +
         '\nSuccess Count=' + successPeople.length.toString() +
         '\nInvitaion Pending=' + problemIds.length.toString() +
          '\nFailed Count=' + errorCount.toString();
        responsemessage +='\n-----------------------------------';
        
        mainresponse.send(responsemessage);
        isFinish = true;
    }
}
function GetNow(){
    var currentDate = new Date()
    var day = currentDate.getDate()
    var month = currentDate.getMonth() + 1
    var year = currentDate.getFullYear()
    var hour = currentDate.getHours()
    var minute = currentDate.getMinutes()
    
    return day + "/" + month + "/" + year + " " + hour +":"+ minute
}

function SendData(person){
    nextPersonIndex ++;
    if(problemIds.indexOf(person.entityUrn.split(":")[3])>-1){
        FetchNextData();
    }
    else{
        const personName =  person.firstName +' '+ person.lastName;
        var post_req = http.request(CreateOption('POST'), function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                if (!isFinish){
                    errorCount ++;
                    FetchNextData();
                }
            }).on('end', function (chunk) {
                if (!isFinish){
                    successPeople.push(personName +" - "+ person.occupation +" - "+ person.publicIdentifier);
                    FetchNextData();
                }
            });
        });
        
        var data = {
                'trackingId' : person.trackingId,
                'invitations': [],
                'excludeInvitations': [],
                'invitee': {
                    'com.linkedin.voyager.growth.invitation.InviteeProfile':{
                    'profileId': person.entityUrn.split(":")[3]
                }
            }   
        }
        if(invNote!=""){
            data["message"] = invNote.replace('@personname',personName);
        }
        
        post_req.write(JSON.stringify(data));
        post_req.end();
    }
}
function AvailabilityControl(){
    var startSlice = problemIterationCount * 100
    var endSlice = (problemIterationCount+1) * 100
   var idsnew =  ids.slice(startSlice, endSlice);
   var idsParam = idsnew.join(',');

    if(ids.length > endSlice)
        problemIterationCount+=1;
    else
        problemIterationCount = 0;
    
   var optionsGetList = CreateOption('GET')
   optionsGetList.path = 'https://www.linkedin.com//voyager/api/identity/profileActionsV2?ids=List('+ idsParam +')'
   http.get(optionsGetList, function(res) {
    if (res.statusCode==200){
        var bodyChunks = [];
        res.on('data', function(chunk) {
            bodyChunks.push(chunk);
        }).on('end', function() {
            var body = Buffer.concat(bodyChunks);
            var jsonbody = JSON.parse(body.toString());
            for (var key in jsonbody.results) {
                if (jsonbody.results.hasOwnProperty(key)) {
                    var element = jsonbody.results[key];
                    for (var isConnect in element.primaryAction) {
                    console.log(isConnect);
                        if(isConnect != "com.linkedin.voyager.identity.profile.actions.Connect"){
                            problemIds.push(key);
                        }
                    }
                }
            }

            if(problemIterationCount == 0)
                FetchNextData();
            else
                AvailabilityControl();
        })
        }
        else{
            mainresponse.send("AvailabilityControl error: "+ res.statusCode);
        }
   });
}
function SendEmailFor403(){
    //mail.SendMail("");
    mainresponse.send("User Id:"+ userId +" {Forbidden 403}")
}
var exports = module.exports = {};
exports.Init = function(response,uId, ln, p, iNote, cList, tkn, ckie,kwords){
        userId = uId;
        isFinish = false;
        errorCount = 0;
        successPeople = [];
        People = [];
        ids = [];
        problemIds = [];
        startIndex = (p - 1) * ln;
        page = p;
        count = ln>100 ? 100 : ln;
        nextPersonIndex = 0 ;
        problemIterationCount = 0;
        linearNumber = ln;
    	mainresponse = response;
        invNote = iNote;
        if(kwords!="")
            keywords = ",title-%3E"+kwords;
        controlList = cList;
        headers = {
            'cookie': ckie,
            'csrf-token': tkn,
            'x-restli-protocol-version': '2.0.0'
        };

        responsemessage = 'start='+ GetNow() +'\n';
};
exports.GetData = function (){
    
        var optionsGet = CreateOption('GET')
        http.get(optionsGet, function(res) {
            if(res.statusCode == 403){
                SendEmailFor403();
                //DisableUserProcess();
            }
            else if (res.statusCode==200){
            var bodyChunks = [];
            res.on('data', function(chunk) {
                bodyChunks.push(chunk);
            }).on('end', function() {
                var body = Buffer.concat(bodyChunks);
                var jsonbody = JSON.parse(body.toString());
                if(jsonbody['elements'].length>0){
                   
                jsonbody['elements'][0].elements.forEach(function(element) {
                    const hitInfo = element.hitInfo['com.linkedin.voyager.search.SearchProfile'];
                    People.push(hitInfo.miniProfile); 
                    ids.push(hitInfo.id)
                    
                }, this);
                 
            }
                startIndex += count;
                if(startIndex < (linearNumber * page)){
                    const dif = (linearNumber * page) - startIndex
                    count = dif >100 ? 100 : dif;
                    exports.GetData();
                }
                else{
                    /*if(People.length>0)
                        AvailabilityControl();*/

                        FetchNextData();
                }
            })
            
            }
            else{
                mainresponse.send("Error: "+res.statusCode)
            }
            
        });
};




