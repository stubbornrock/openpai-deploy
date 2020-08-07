const axios = require('axios')
const qs = require('querystring')

const TKE_ENDPOINT = 'http://192.168.19.118'
const tkeAuth = {login:'chengs', password:'Chengshuai123!@#', tenant:'default'};

// 创建axios实例
const tkeService = axios.create({
    baseURL: TKE_ENDPOINT,
    timeout: 5 * 1000, // 请求超时时间
    withCredentials: true, //跨域请求时是否需要使用凭证
    maxRedirects: 10, //最大重定向次数
});

// 创建request拦截器
// 略...
// 创建response拦截器
tkeService.interceptors.response.use(
    // 成功response执行的函数
    response => {
        console.log(response.headers);
        return response;
    },
    // response 失败执行的函数
    error => {
        console.log(error);
    }
    
);

const token = async () => {
    try {
        const loginRes = await tkeService.get('/');
        console.log(loginRes);
        //tkestack
        const loginURL = loginRes.request.path;
        const postRes  = await tkeService.post(loginURL,qs.stringify(tkeAuth),
            {headers:{'Content-Type': 'application/x-www-form-urlencoded'}});
        //console.log(postRes);
            /*
        const axiosData = {
            url: loginURL,
            method: 'POST',
            data: qs.stringify(tkeAuth),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            withCredentials: true,
            maxRedirects: 10 
        }
        const loginRes = await axios(axiosData);
        console.log(loginRes.request._redirectable._redirectCount);
        console.log(loginRes);

        aa = 'http://192.168.19.118/apis/business.tkestack.io/v1/namespaces/prj-jf9pmf2h/namespaces'
        const bb = await axios.get(aa);
        console.log(bb);
        if (loginRes.data.indexOf("无效的用户名或者密码") != -1) {
            console.log("你目前没有权限登录可视化建模平台，请于管理员联系！");
        } else {
            console.log("推理平台，登录成功！");
        }*/
    } catch (error) {
        //console.log("登录超时")
        throw error;
    }
}

token()
