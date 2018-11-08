var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if(!port){
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function(request, response){
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if(pathWithQuery.indexOf('?') >= 0){ queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/

    console.log('方方说：含查询字符串的路径\n' + pathWithQuery)

    if(path === '/'){
        var string = fs.readFileSync("./index.html", "utf-8");
        if(!request.headers.cookie) {
            //  如果没有cookie就跳转到登录页面
            response.statusCode = 401;
            response.writeHead(302,{
                'Location': 'http://localhost:8888/login'
            })
        } else {
            var cookies = request.headers.cookie.split(";");
            var hash = {};
            for(let i = 0; i<cookies.length; i++) {
                let parts = cookies[i].split("=");
                let key = parts[0].trim();
                let value = parts[1].trim();
                hash[key] = value;
            }
            let email = hash.login_email;
            let password = hash.password;
            let users = fs.readFileSync('./userDb', "utf-8");
            let found = false;
            users = JSON.parse(users);  // 变为数组，因为db里面是数组
            for(let i = 0; i<users.length; i++) {
                if(email ===users[i].email) {
                    found = true;
                    break;
                }
            }
            if(found) {
                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/html;charset=utf-8');
                string = string.replace("email", email);
                string = string.replace("password", password);
                response.write(string);
            } else {
                response.statusCode = 400;
                response.write(`{
            "errors": "has not login"
           }`)
            }
        }
        response.end();
    }else if(path === '/main.js') {
        var string = fs.readFileSync("./main.js", "utf-8");
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/javascript;charset=utf-8')
        response.write(string);
        response.end()
    } else if(path === "/login" && method === "POST") {
        readBody(request).then((body) => {
            let strings = body.split("&");
            let hash = {};
            //  把接收到的数据分割好放入hash中
            strings.forEach((string) => {
                let parts = string.split("=");
                let key = parts[0];
                let value = parts[1];
                hash[key] =  decodeURIComponent(value); // 把email中的%40变为@
            });
            let {email, password} = hash;
            // 检查邮箱是否填写正确
            if(email.indexOf("@") === -1) {
                response.statusCode = 401;
                response.write(`{
                    "errors": {
                        "email": "invalid"
                    }
                }`)
            } else {
                // 检查账号密码是否在数据库中匹配
                var users = fs.readFileSync("./userDb", "utf-8");
                try {
                    //  如果users可以JSON转换则正常操作，否则置空
                    users = JSON.parse(users);
                } catch(exception) {
                    users = [];
                }
                var isLogin = false;
                var obj = null;
                for(let i = 0 ; i<users.length; i++) {
                    if(users[i].email === email && users[i].password === password) {
                        isLogin = true;
                        obj = users[i];
                        break;
                    }
                }
                if(isLogin) {
                    response.statusCode = 200;
                    var userString = JSON.stringify(obj);
                    response.setHeader("Set-Cookie", [`login_email=${obj.email}`,`password=${obj.password}`, "3=123"]);
                    response.write(userString);
                } else {
                    response.statusCode = 401;
                    response.write(`{
                    "errors": "email or password is false"
                    }`);
                }
            }
            response.end();
        });
    }else if(path === "/login") {
        var strings = fs.readFileSync("./html/login.html", "utf-8");
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html;charset=utf-8;");
        response.write(strings);
        response.end();
    } else if(path === "/sign_up" && method === "POST") {
        readBody(request).then((body) => {
            let strings = body.split("&");
            let hash = {};
            strings.forEach((string) => {
                let parts = string.split("=");
                let key = parts[0];
                let value = parts[1];
                hash[key] =  decodeURIComponent(value);
            });
            let {email, password, password_confirmation} = hash;
            //  邮箱是否填写正确
            if(email.indexOf("@") === -1) {
                response.statusCode = 400;
                response.write(`{
                    "errors": {
                        "email": "invalid"
                    }
                }`);
            } else if(password !== password_confirmation) {
                response.statusCode = 400;
                response.write(`{
                    "errors": {
                        "password": "password not match"
                    }
                }`);
            } else {
                response.statusCode = 200;
                var users = fs.readFileSync("./userDb", "utf-8");
                try {
                    //  如果users可以JSON转换则正常操作，否则置空
                    users = JSON.parse(users);
                } catch(exception) {
                   users = [];
                }
                //  判断该注册账号是否存在于数据库中
                var inUse = false;
                for(let i = 0; i < users.length; i++) {
                    if(users[i].email === email) {

                        inUse = true;
                        break;
                    }
                }
                if(inUse) {
                    response.statusCode = 400;
                    response.write(`{
                            "errors": {
                                "email": "email in use"
                            }
                        }`);
                } else {
                    users.push({
                        email: email,
                        password: password
                    });
                    var usersString = JSON.stringify(users);
                    fs.writeFileSync("./userDb", usersString);
                }
            }
            response.end();
        });

    } else if(path === "/sign_up") {
        var string = fs.readFileSync("./html/sign_up.html", "utf-8");
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html;charset=utf-8;");
        response.write(string);
        response.end();
    }  else if(path === "/xxx") {
        response.statusCode = 200;
        response.setHeader("Content-type", "text/json");
        response.write(`{
            "message": {
                "name": "Jason",
                "age": 23,
                "major": "fronted"
            }
        }`);
        response.end();
    } else{
        response.statusCode = 404
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write('呜呜呜')
        response.end()
    }

    /******** 代码结束，下面不要看 ************/
})

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = [];
        request.on("data", (chunk) => {
            body.push(chunk);
        }).on("end", () => {
            body = Buffer.concat(body).toString();
            resolve(body);
        });
    });
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)


