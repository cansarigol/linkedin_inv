LinkedIn Invitation Bot

1- Create database and execute "app_user.sql" file for table user table. (dbname = linkedininv_db, username=postgres, password=postgres)

2- install node modules

3- run node.js

4- Login 
   e.g. http://localhost:5000/login?email=xxx@gmail.com&password=ppp

5- decide industries (id-> id column app_user table, clist-> industry id in linkedin)
    e.g. http://localhost:5000/update_clist?id=1&clist=137,4

    For ids -> http://localhost:5000/industries?id=1&q={industry_name_param}

6- app_user table inote column for send invitations with message. (@personname parameter for include person name in message body)

7- Send invites
    e.g. http://localhost:5000/sendinv?id=2&count=10