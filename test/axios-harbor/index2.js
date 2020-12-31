//导入模块
const { URL } = require('url');
const axios = require('axios');
const qs = require('querystring');

//系统常量,后续从配置文件获取
const HARBOR_ENDPOINT = 'http://192.168.21.228/';
//const HARBOR_AUTH = { principal: 'admin', password: 'Harbor12345'};
const HARBOR_AUTH = { principal: 'test', password: 'Test123!@#'};

//生成TKEStack的axios请求客户端
const _getClient = () => {
    const config = {
        baseURL: new URL(HARBOR_ENDPOINT).toString(),
        maxRedirects: 0,
        timeout: 5 * 1000,
        withCredentials: true
    };
    return axios.create(config);
};

const _auth = async () => {
    let cookies = ['harbor-lang=zh-cn']
    const client = _getClient()
    const res = await client.post('/login', qs.stringify(HARBOR_AUTH));
    if (200 === res.status) {
        let cookie = res.headers["set-cookie"][0];
        console.log(res.headers["set-cookie"]);
        cookies.push(cookie.split(';')[0]);
    } else {
        console.log("授权失败")	
    }
    console.log(cookies.join(";"));
    return cookies.join(";");
}

// 使用Cookie向tkestack API 发送请求
const _requestWithCookie = async (url, method, data) => {
    const client = _getClient();
    let cookies = await _auth();
    try {
        const headers = { 'Cookie': cookies,};
        if (method === 'GET') {
            let resp = await client.get(url, {headers: headers});
            return resp.data
        } else {
            throw '请求方法有误！请选择[GET, POST, DELETE]';
        }
    } catch (error) {
        console.log('发送请求失败，重新获取COOKIES发送...');
    }
}
// 列出所有的项目
const _listAllProjects = async (username) => {
    const url = '/api/projects';
    const projects = await _requestWithCookie(url, 'GET');
    console.log(projects);
    console.log(projects.forEach(item => console.log(item.name)));
}

// 列出用户的项目
//const _listUserProjects = async (username) => {
//    userProjects = [];
//    let allProjects = await _listAllProjects();
//    console.log(allProjects.forEach(p => console.log(p.owner_id)));
//    allProjects.filter( async (item) => {
//        const url=`/api/projects/${item.project_id}/members`
//        const members = await _requestWithCookie(url, 'GET');
//        //const usernames = members.forEach( member => console.log(member));
//        //console.log(usernames);
//    });
//}

_listAllProjects()
