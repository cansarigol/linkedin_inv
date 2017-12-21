var express = require('express');
var app = express();
var http = require('https')
var timeout = require('connect-timeout'); 


var appjs = require('./app');
var pg = require('pg');
var querystring = require('querystring');

var conn = {
    user: "linkedin_user",
    password: "postgres",
    database: "linkedin_db",
    port: 5432,
    host: "localhost",
    ssl: false
}; 


app.set('port', (process.env.PORT || 5000));

app.use(errorHandler);
app.use(clientErrorHandler);
app.use(timeout('1000s'));

function errorHandler (err, req, res, next) {
  res.status(500)
  res.render('error', { error: err })
}
function clientErrorHandler (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' })
  } else {
    next(err)
  }
}
app.get('/update_clist', function(request, response){
    const id = request.query['id'];
    const clist = request.query['clist'];
    
    if(id === undefined || clist === undefined){
        response.send("Missing parameter");
        return;
    }
    
    var client = new pg.Client(conn); 
    client.connect();
    client.query("UPDATE app_user set controllist='"+ clist +"' where id="+ id +" ").then(() =>{
        client.end();
    })

    response.send('Ok');
    
});
app.get('/industries', function(request, response){
    const id = request.query['id'];
    const q = request.query['q'];
    
    if(id === undefined || q === undefined){
        response.send("Missing parameter");
        return;
    }
    
    var client = new pg.Client(conn); 
    client.connect();
    
        const query = client.query("SELECT * FROM app_user WHERE id='"+ id +"' and is_active=true")
        .then((row) => {
            if(row.rows.length>0){
                const firstRow = row.rows[0];
                var optionsGet = {
                    host: "www.linkedin.com",
                    method: 'GET',
                    path: "https://www.linkedin.com/voyager/api/typeahead/hits?q=federated&query="+ q +"&types=List(INDUSTRY)",
                    headers: {
                            'cookie': firstRow.cookie ,
                            'csrf-token': firstRow.token,
                            'x-restli-protocol-version': '2.0.0'
                        }
                  };
                http.get(optionsGet, function(res) {
                    if (res.statusCode==200){
                    var bodyChunks = [];
                    res.on('data', function(chunk) {
                        bodyChunks.push(chunk);
                    }).on('end', function() {
                        var body = Buffer.concat(bodyChunks);
                        var jsonbody = JSON.parse(body.toString());
                        var results = "";
                        jsonbody['elements'].forEach(function(element) {
                            const hitInfo = element.hitInfo['com.linkedin.voyager.typeahead.TypeaheadIndustry'];
                            
                            var id = hitInfo['industryUrn'].toString().split(':')[3];
                            var text = element.text.text;
                            results += id+ " - " + text + "\n";
                            //var client = new pg.Client(conn); 
                            //client.connect();
                            //client.query("INSERT INTO app_industries (id, des) values("+ id +",'"+ text +"') ").then(() =>{
                            //    client.end();
                            //})
                            
                        }, this);
                        
                        
            
                        response.send(results);
                    });
                 }else{
                    response.send(res.statusMessage);
                 }
                });
            }else{
                response.send("User not found");
            }
    
            client.end();
        });
    
});
 
app.get('/login', function(request, response) {
    const email = request.query['email'];
    const password = request.query['password'];

    if(password  === undefined || email === undefined){
        response.send("Missing parameter!");
        return;
    }
    var host = "www.linkedin.com";

    var data = {
        'session_key': email,
        'session_password': password,
        'isJsEnabled': false,
        'loginCsrfParam': '9eee5069-0afa-43bc-8020-38022b3da560'
    }   
    var formData = querystring.stringify(data);
    var contentLength = formData.length;

    var headers = {
        'Cookie':'bcookie="v=2&9eee5069-0afa-43bc-8020-38022b3da560";leo_auth_token="GST:9bZklxxcw8JYiKK259UZT6Ig8iiHHCUUAO9_CysN6U4Y_50U19o_TD:1503516496:0e8e21488b0017d35bc896e6903c95fc811e6a13"',
        'Content-Type':'application/x-www-form-urlencoded',
        'Content-Length': contentLength,
    };

    var options = {
        host: host,
        method: 'POST',
        path: '/uas/login-submit',
        headers: headers
    }
    var post_req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                var error = "";
            }).on('end', function (chunk) {
                var finis= "";
            });

            var bcookie = '';
            var jsessionid = '';
            var li_at = '';
            for (var index = 0; index < res.headers['set-cookie'].length; index++) {
                var element = res.headers['set-cookie'][index];
                if(element.indexOf('JSESSIONID')!=-1){
                    jsessionid = element.split(';')[0]
                } else if(element.indexOf('bcookie')!=-1){
                    bcookie = element.split(';')[0]
                } else if(element.indexOf('li_at')!=-1){
                    li_at = element.split(';')[0]
                }

            }
            if(jsessionid==""){
                response.send("Invalid email or password");
            }
            else{
                var cookie = jsessionid+";"+li_at
                var client = new pg.Client(conn); 
                client.connect();
                client.query("UPDATE app_user set cookie='"+cookie+"', token='"
                + jsessionid.replace('JSESSIONID=','').replace('"','').replace('"','') 
                +"' WHERE email='"+ email +"'").then(() =>{
                    client.end();
                })
                

                response.send("Login successful\nMy cookie: "+ cookie);
            }
            
        });
        
        post_req.write(formData);
        post_req.end();
});

app.get('/sendinv', function(request, response) {
const id = request.query['id'];
const count = request.query['count'];

if(count === undefined || id === undefined){
    response.send("Missing parameter");
    return;
}

var client = new pg.Client(conn); 
client.connect();

    const query = client.query("SELECT * FROM app_user WHERE id='"+ id +"' and is_active=true")
    .then((row) => {
        if(row.rows.length>0){
            const firstRow = row.rows[0];
            const controllist = firstRow.controllist == null 
            ? [] 
            : firstRow.controllist.split(',').map((item)=>item.trim());
            const inote = firstRow.inote || "";
            const page_count = count / 10;
            for(var i = 0; i < page_count; i++){
                appjs.Init(response,firstRow.id, 10, (i+1), inote, controllist, firstRow.token, firstRow.cookie, firstRow.keywords)
                appjs.GetData();
            }
            
        }else{
            response.send("User not found");
        }

        client.end();
    });
});

app.listen(app.get('port'), function() {
  console.log('app is running on port');
});
