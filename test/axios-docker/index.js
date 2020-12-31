const { Docker } = require('node-docker-api');
const { URL } = require('url');
const tar = require('tar-fs');
const fs = require('fs');

// 定义宏变量
const HARBOR_URI = '192.168.21.228'
const HARBOR_USER = 'admin'
const HARBOR_PASS = 'Harbor12345'

// 获取Docker客户端
const getClient = (host, port=5678, protocol='http') => {
      return new Docker({ host: host, port: port, protocol: protocol })
}

// 推送镜像至仓库中
const docker_push = async (client, image) => {
    // 生成访问Token
    const auth = {username: HARBOR_USER, password: HARBOR_PASS, serveraddress: HARBOR_URI}
    const token = {'key': Buffer.from(JSON.stringify(auth)).toString('base64')};
    //推送
    const image_uri = `${image.repo}:${image.tag}`;
    //logger.info(`Push 镜像${image_uri}到镜像仓库中`);
    try {
        const resp = await client.image.get(image_uri).push(token);
    } catch (error) {
        //logger.error(`Push 镜像${image_uri}到镜像仓库失败：` + error);
        console.log(`Push 镜像${image_uri}到镜像仓库失败：` + error);
    }
}

// 将容器进行Commit成镜像
const docker_commit = async (client, username, containerId, comment='Created By CTPAI') => {
    // 获取容器信息
    try {
        const status = await client.container.get(containerId).status();
        // 原镜像名
        const image_uri = status.data.Config.Image;
        const image = image_uri.split('@')[0].split('/').pop();
        // 镜像TAG
        const tag = new Date().toLocaleString()
                            .replace(' ','T')
                            .replace(/:/g,'-');
        let opts = {repo:`${HARBOR_URI}/${username}/${image}`, tag: tag, comment: comment}
        // 提交镜像
        const id = await client.container.get(containerId).commit(opts);
        console.log(id);
        //logger.info(`Commit 容器${containerId}生成镜像成功！`);
        return opts;
    } catch (error) {
        //logger.error(`Commit 容器${containerId}生成镜像失败：` + error);
        console.log(`Commit 容器${containerId}生成镜像失败：` + error);
    }
}

// 需要导出的函数
const snapshot = async (host, port, username, containerId) => {
    const client = getClient(host, port);
    const image = await docker_commit(client, username, containerId);
    if (image) {
        await docker_push(client, image);
    }
}

const docker_search = async (image_uri) => {
    const auth = {username: HARBOR_USER, password: HARBOR_PASS, serveraddress: HARBOR_URI}
    const token = {'key': Buffer.from(JSON.stringify(auth)).toString('base64')};
    console.log(token);
}

// const build = async (host, port) => {
//     const client = getClient(host, port);
//     //tar.pack('./Dockerfile').pipe(fs.createWriteStream('/path/to/Dockerfile.tar'));

//     const s = fs.createReadStream('/path/to/Dockerfile.tar');
//     client.image.build(s, {
//         t: 'testimg'
//     });
// }

docker_search('aaaa');
// 测试
// snapshot('192.168.19.34', 2375, 'gaoda', '5b3fbe7c9986');
// build('192.168.19.34', 2375);
//
//const u = new URL("docker://53535f6a2230867bf8aec4227f209b0db9fb45660ca6b7385ebb234c721af26b")
//console.log(u);
