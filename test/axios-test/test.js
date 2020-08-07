var fs = require('fs');

cookie = "ggooo;xxxx;lalalal";

const readCookie = () => {
    cookie = fs.readFileSync('./cookie','utf8');
    return cookie
}

const writeCookie = (cookie) => {
    fs.writeFileSync('./cookie.json', cookie, 'utf8');
}

const readCookies = () => {
    try {
        cookie = fs.readFileSync('./cookies','utf8');
    } catch (error) {
        if (error.code == "ENOENT") {
            console.log("gggg")
        }
    }   
}
//writeCookie(cookie);
readCookies()
