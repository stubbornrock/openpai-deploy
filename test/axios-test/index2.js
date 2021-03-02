//导入模块
const axios = require('axios');
const yaml = require('js-yaml');
const qs = require('querystring');
const fs = require('fs');
const mustache = require('mustache');
const { URL } = require('url');
const { TKE_DEPLOYMENT,TKE_SERVICE,TKE_NAMESPACES } = require('./tkeDeploymentTemplate');

//系统常量,后续从配置文件获取
const TKE_ENDPOINT = 'http://192.168.21.235';
const TKE_AUTH = { login: 'admin', password: 'Kaifa123!@#', tenant: 'default' };
const TKE_CLUSTER = 'cls-rdvfv92b';
const TKE_NAMESPACE = 'cash';
const VNC_IMAGE = 'nginx:latest';

const REQUEST_COOKIES_RETRIES = 5;

//生成TKEStack的axios请求客户端
const _getClient = () => {
    const config = {
        baseURL: new URL(TKE_ENDPOINT).toString(),
        maxRedirects: 0,
        timeout: 5 * 1000,
        withCredentials: true
    };
    const client = axios.create(config);
    //请求response拦截器
    client.interceptors.response.use(
        resp => {
            return resp;
        },
        error => {
            if (302 === error.response.status || 303 === error.response.status) {
                return error.response;
            } else {
                console.log(error);
                return "请求返回出错: " + error;
            };
        }
    );
    return client;
};

//生成请求所携带的 cookies
const _generateTKECookies = async () => {
    const client = _getClient();
    let code = 200;
    let url = '/';
    let cookies = ['language=zh', 'regionId=1'];
    // 经过2次redirect后，会生成用户登录的路径
    do {
        let loginRes = await client.get(url);
        console.log("Request URL:" + url + "\tStatus:" + loginRes.status);
        if (302 === loginRes.status) {
            code = loginRes.status;
            url = loginRes.headers.location;
        } else {
            break;
        }
    }
    while (code === 302);
    // 经过5次跳转后，才能够获取获取系统的Cookies
    let method = 'POST';
    do {
        let validateRes = null;
        //第一次发送post请求
        if (method === 'POST') {
            validateRes = await client.post(url, qs.stringify(TKE_AUTH));
            method = 'GET';
        } else {
            validateRes = await client.get(url);
        }
        console.log("Request URL:" + url + "\tStatus:" + validateRes.status);
        // 登录系统的redirect 跳转码有 302,303 两种
        if (302 === validateRes.status || 303 === validateRes.status) {
            code = validateRes.status;
            url = validateRes.headers.location;
            if (validateRes.headers.hasOwnProperty('set-cookie')) {
                let tkeCookie = validateRes.headers["set-cookie"][0];
                cookies.push(tkeCookie.split(';')[0]);
                break;
            }
        } else {
            break;
        }
    }
    while (code === 302 || code === 303);
    //生成cookies
    if (cookies.length < 3){
        //return Promise.reject('用户授权失败，请检查用户名密码！');
        return null;
    } else {
        return cookies.join(";");
    }
}


const _readCookies = async (retry=false) => {
    let cookies = null
    if (retry == false) {
        try {
            cookies = fs.readFileSync('./cookies','utf8');
        } catch (error) {
            if (error.code == "ENOENT") {	
                cookies = await _generateTKECookies();
                fs.writeFileSync('./cookies', cookies);
            }
        }
    } else {
        cookies = await _generateTKECookies();
        fs.writeFileSync('./cookies', cookies);
    }
    return cookies;
}

// 使用Cookie向tkestack API 发送请求
const _requestWithCookie = async (url, method, data) => {
    const client = _getClient();
    let cookies = await _readCookies();
    let count = 0
    while (count <= REQUEST_COOKIES_RETRIES) {
        if (cookies !== null ){
            try {
                const headers = { 'Cookie': cookies, 'X-TKE-ClusterName': TKE_CLUSTER};
                if (method === 'GET') {
                    let resp = await client.get(url, {headers: headers});
                    return resp.data;
                } else if ( method === 'POST') {
                    await client.post(url, data, {headers: headers});
                } else if ( method === 'DELETE') {
                    await client.delete(url, {data: data, headers: headers});
                } else {
                    throw '请求方法有误！请选择[GET, POST, DELETE]';
                }
                break;
            } catch (error) {
                console.log('发送请求失败，重新获取COOKIES发送...');
            }
        } else {
            console.log('获取COOKIES失败！重新获取COOKIES...');
        }
        count++;
        console.log("尝试第"+count+"次重新获取COOKIES...");
        cookies = await _readCookies(true);
    }
}
//_requestWithCookie('/apis/business.tkestack.io/v1/namespaces/prj-jf9pmf2h/namespaces');
//_requestWithCookie('/apis/apps/v1/namespaces/gongdan/deployments');

// 创建TKESTACK deployment
const _generateTKEDeployment = (data) => {
    // 使用数据进行模板渲染
    const deploymentStr  = mustache.render(TKE_DEPLOYMENT,data);
    const deploymentObj  = yaml.safeLoad(deploymentStr);

    const serviceStr  = mustache.render(TKE_SERVICE,data);
    const serviceObj  = yaml.safeLoad(serviceStr);

    const namespaceStr = mustache.render(TKE_NAMESPACES,data);
    const namespaceObj  = yaml.safeLoad(namespaceStr);

    return {
        deploymentObj: deploymentObj, 
        serviceObj: serviceObj,
        namespaceObj: namespaceObj
    }
}

// 列出所有的pvcs
const listTKEPVCs = async () => {
    //获取命名空间的 pvcs 的列表
    let requestURL = `/api/v1/namespaces/${TKE_NAMESPACE}/persistentvolumeclaims`
    const pvcResp = await _requestWithCookie(requestURL, 'GET');
    let pvcs = []
    pvcResp.items.forEach(item => pvcs.push(item.metadata.name));
    console.log(pvcs);
}


// 创建deployment
const createTKEDeployment = async (username,deploymentName,vcudaCore=0.5,vcudaMemory=2) => {
    let suffix = Date.now().toString(16);
    suffix = suffix.substring(suffix.length - 6);
    const data = {
        name: (deploymentName !== undefined)? deploymentName :`ai-desktop-${suffix}`,
        namespace: TKE_NAMESPACE,
        username: username,
        image: VNC_IMAGE,
        vcudaCore: vcudaCore*100,
        vcudaMemory: vcudaMemory,
        gpuType: 'aa'
    }
    const {deploymentObj, serviceObj, namespaceObj} = _generateTKEDeployment(data);
    //console.log(deploymentObj);
    //console.log(JSON.stringify(deploymentObj));
    console.log(namespaceObj);
    const requestURL = '/apis/business.tkestack.io/v1/namespaces/prj-c2qnk8ll/namespaces'
    _requestWithCookie(requestURL,'POST', namespaceObj);
    //const requestURL = `/apis/platform.tkestack.io/v1/clusters/${TKE_CLUSTER}/apply`
    //try {
    //    // 创建 deployment
    //    _requestWithCookie(requestURL,'POST', deploymentObj);

    //    // 创建 Service
    //    // deployName 为空时,就创建Service, 
    //    if (deploymentName === undefined) {
    //        _requestWithCookie(requestURL,'POST', serviceObj);
    //    }
    //} catch (error) {
    //    throw '创建VNC Deployments 失败：'+error;
    //}
}

// 删除deployment
const deleteTKEDeployment = async (deployment) => {
    try {
        // 删除 deployment
        let requestURL = `/apis/apps/v1/namespaces/${TKE_NAMESPACE}/deployments/${deployment}`;
        let dataObj = { propagationPolicy: "Background" };
        _requestWithCookie(requestURL,'DELETE', dataObj);
        // 删除 Service
        requestURL = `/api/v1/namespaces/${TKE_NAMESPACE}/services/${deployment}`;
        _requestWithCookie(requestURL,'DELETE', dataObj);
    } catch (error) {
        throw '删除VNC Deployments 失败：'+error;
    }    
}

// 列出所有的deployment
const listTKEDeployment = async () => {
    // 获取deployments 列表
    //let requestURL = `/apis/apps/v1/namespaces/${TKE_NAMESPACE}/deployments/ai-desktop-aa45e6/pods`
    let requestURL = `/apis/apps/v1/namespaces/${TKE_NAMESPACE}/deployments/`
    //let requestURL = `/apis/apps/v1/namespaces/${TKE_NAMESPACE}/pods/`
    const deploymentResp = await _requestWithCookie(requestURL, 'GET');
    //console.log(typeof deploymentResp.items[0].metadata.annotations['tencent.com/gpu-assigned']);
    console.log(deploymentResp);
    //if (deploymentResp.items[0].metadata.annotations['aaa'] && deploymentResp.items[0].metadata.annotations['aaa'] === true) {
    //    console.log("ggg");
    //}
    //// 获取所有的services 列表
    //requestURL = `/api/v1/namespaces/${TKE_NAMESPACE}/services`
    //const serviceResp = await _requestWithCookie(requestURL,'GET');
    //let services = {}
    //serviceResp.items.forEach( element => {
    //    let key = element.metadata.name;
    //    services[key] = element;
    //});
    //// 返回客户端需要的信息
    //let deployments = [];
    //deploymentResp.items.forEach( element => {
    //    // 计算持续天数
    //    const createDate = new Date(element.metadata.creationTimestamp).getTime();
    //    const nowDate = Date.now();
    //    const durationDays = Math.ceil((nowDate - createDate) / (1000 * 3600 * 24));
    //    // 计算资源规格
    //    let resources = {}
    //    const deploymentContainers = element.spec.template.spec.containers;
    //    deploymentContainers.forEach( container => {
    //        const limits = container.resources.limits;
    //        for ( let [key, value] of Object.entries(limits) ) {
    //            if ('tencent.com/vcuda-core' ===  key ) { 
    //                key = 'gpu';
    //                value = (value/100).toFixed(1);
    //            } 
    //            if ('tencent.com/vcuda-memory' ===  key ) { 
    //                key = 'gpu-memory';
    //                value = value * 256;
    //            }
    //            if (key in resources) {
    //                resources[key] += value;
    //            } else {
    //                resources[key] = value;
    //            }
    //        }
    //    });
    //    let accessPort = null
    //    // 获取服务端口号
    //    try {
    //        accessPort = services[element.metadata.name].spec.ports[0].nodePort
    //    } catch (error) {
    //        console.log(`${element.metadata.name}获取访问端口失败`);
    //    }
    //    let deploy = {
    //        name: element.metadata.name,
    //        creationTimestamp: element.metadata.creationTimestamp,
    //        durationDays: durationDays,
    //        username: element.metadata.labels.username,
    //        status: (element.status.readyReplicas >= 1) ? true : false,
    //        resources: resources,
    //        nodePort: accessPort
    //    }
    //    deployments.push(deploy);
    //});
    //console.log(deployments);
    //return deployments;
}

const getTKEDeployment = async (deploymentName) => {
    // 获取某一个deployment
    //let requestURL = `/apis/apps/v1/namespaces/${tkeServer.namespace}/deployments/${deploymentName}`;
    let requestURL = `/apis/apps/v1/namespaces/${TKE_NAMESPACE}/deployments/${deploymentName}`;
    const deployment = await _requestWithCookie(requestURL, 'GET');
    // 获取一个service
    //requestURL = `/api/v1/namespaces/${tkeServer.namespace}/services/${deploymentName}`;
    requestURL = `/api/v1/namespaces/${TKE_NAMESPACE}/services/${deploymentName}`;
    const service = await _requestWithCookie(requestURL, 'GET');

    if (deployment && service){
        // 计算持续天数
        const createDate = new Date(deployment.metadata.creationTimestamp).getTime();
        const nowDate = Date.now();
        const durationDays = Math.ceil((nowDate - createDate) / (1000 * 3600 * 24));
        // 计算资源规格
        let resources = {}
        const deploymentContainers = deployment.spec.template.spec.containers;
        deploymentContainers.forEach(container => {
            const limits = container.resources.limits;
            for (let [key, value] of Object.entries(limits)) {
                if ('tencent.com/vcuda-core' === key) {
                    key = 'gpu';
                    value = (value / 100).toFixed(1);
                }
                if ('tencent.com/vcuda-memory' === key) {
                    key = 'gpuMemory';
                    value = value * 256;
                }
                if (key in resources) {
                    resources[key] += value;
                } else {
                    resources[key] = value;
                }
            }
        });
        // 获取服务端访问URL
        let basePath=undefined;
        const authToken = Buffer.from(deployment.metadata.labels.username).toString('base64');
        const ahosts= "192.168.19.119,192.168.19.120";
        const accessPort = service.spec.ports[0].nodePort;
        //const hosts = tkeServer.hosts.split(',');
        const hosts = ahosts.split(',');
        const accessHost = hosts[Math.floor(Math.random() * hosts.length)];
        basePath=`http://${accessHost}:${accessPort}`;

        // 生成所有的工具地址
        const tools = [
            { 'name': 'AI云桌面',
              'description': '可视化AI云桌面操作系统',
              'url': `${basePath}/login?next=${encodeURIComponent('/tools/vnc/?password=vncpassword')}&token=${authToken}`
            },
            { 'name': 'VSCode开发工具',
              'description': 'Web可视化VSCode开发集成环境',
              'url': `${basePath}/login?next=${encodeURIComponent('/tools/vscode/')}&token=${authToken}`
            },
            { 'name': '命令行终端',
              'description': 'Web Shell 命令行工具',
              'url': `${basePath}/login?next=${encodeURIComponent('/terminals/main/')}&token=${authToken}`
            },
            { 'name': 'NetData资源监控',
              'description': '使用netdata将服务器信息实时、动态展示',
              'url': `${basePath}/login?next=${encodeURIComponent('/tools/netdata/')}&token=${authToken}`
            },
            { 'name': 'Glance资源监控',
              'description': 'Glances是用Python编写的跨平台系统监控工具',
              'url': `${basePath}/login?next=${encodeURIComponent('/tools/glances/')}&token=${authToken}`
            },
            { 'name': '云桌面文件系统',
              'description': '使用文件系统实现工作空间文件一系列操作',
              'url': `${basePath}/login?next=${encodeURIComponent('/shared/filebrowser/files/workspace/?token=admin')}&token=${authToken}`
            }
        ]
        // 页面返回对象
        let deploy = {
            name: deployment.metadata.name,
            creationTimestamp: deployment.metadata.creationTimestamp,
            durationDays: durationDays,
            username: deployment.metadata.labels.username,
            status: (deployment.status.readyReplicas >= 1) ? true : false,
            resources: resources,
            tools: tools
        }
        console.log(deploy);
    }
}

// 列出所有的镜像
const listAllImages = async (namespaceName='aidesktop') => {
    // 获取namespace
    const requestURL = '/apis/registry.tkestack.io/v1/namespaces/';
    const namespaceList = await _requestWithCookie(requestURL,'GET');
    const filterNamespaceList = namespaceList.items.filter(namespace => namespace.spec.name === namespaceName);
    // 获取镜像列表
    let images = [];
    if (filterNamespaceList.length !== 0) {
        const namespaceId = filterNamespaceList[0].metadata.name;
        const requestURL = `/apis/registry.tkestack.io/v1/namespaces/${namespaceId}/repositories`;
        const repositoryList = await _requestWithCookie(requestURL,'GET');
        repositoryList.items.forEach( repo => {
            const namespaceName = repo.spec.namespaceName;
            const name = repo.spec.name;
            const tags = repo.status.tags;
            tags.forEach(tag => {
                const imageFullName = `${namespaceName}/${name}:${tag.name}`
                images.push(imageFullName);
            });
        });
    }
    return images;
}

//images = listAllImages()
//console.log(images);
//createTKEDeployment('chengs001');
//deleteTKEDeployment('chengs');
listTKEDeployment();
//listTKEPVCs()
//getTKEDeployment('ai-desktop-59d8ac')

//ENDPOINT=`http://192.168.19.118/?username=chengs&password=Chengshuai123!@#&cluster=cls-mdbrcg5b&namespace=gongdan&image=latest`;
//
//const url = new URL(ENDPOINT);
//console.log(url);
