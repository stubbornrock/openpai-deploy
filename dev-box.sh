#!/bin/bash
CURRENT_PATH=`pwd`
HARBOR='192.168.24.21'
TAG="ctbri-v1.5.0"

function rebuild(){
  # /pai/contrib/kubespray/script/enviroment.sh
  # mkdir -p ${HOME}/pai-deploy/
  # git clone -b release-2.11 kubespray.git ${HOME}/pai-deploy/kubespray
  # cp -rfp ${HOME}/pai-deploy/kubespray/inventory/sample ${HOME}/pai-deploy/kubespray/inventory/pai
  
  # /pai/contrib/kubespray/requirement.sh
  # mkdir -p ${HOME}/pai-pre-check/
  # python3 script/pre_check_generator.py -l ${LAYOUT} -c ${CLUSTER_CONFIG} -o ${HOME}/pai-pre-check
  # ansible-playbook -i ${HOME}/pai-pre-check/pre-check.yml environment-check.yml -e "@${CLUSTER_CONFIG}"

# 请在当前目录下clone好，kubespray/pai的代码，并切换到相应的分支
# ! 重要
# COPY kubespray/requirements.txt /tmp/kubespray/requirements.txt
# COPY pai/contrib/kubespray/script/requirements.txt /tmp/pai/requirements.txt

cat > ${CURRENT_PATH}/dev-box.Dockerfile << __EOF__
FROM ${HARBOR}/openpai/dev-box:latest
COPY kubespray/requirements.txt /tmp/kubespray/requirements.txt
COPY pai/contrib/kubespray/script/requirements.txt /tmp/pai/requirements.txt
RUN apt-get -y update \
    && apt-get -y install software-properties-common python3 python3-dev parallel \
    && curl https://bootstrap.pypa.io/3.5/get-pip.py -o get-pip.py \
    && python3 get-pip.py \
    && apt-get -y install sshpass \
    && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple paramiko \
    && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple ansible==2.9.7 \
    && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple -r /tmp/kubespray/requirements.txt \
    && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple -r /tmp/pai/requirements.txt
__EOF__

  docker build -t ${HARBOR}/openpai/dev-box:${TAG} -f dev-box.Dockerfile .
  docker push ${HARBOR}/openpai/dev-box:${TAG}
  rm -rf dev-box.Dockerfile
}

function restart() {
  mkdir -p ${CURRENT_PATH}/data
  docker stop dev-box && docker rm dev-box
docker run -itd \
   -e TAG=${TAG} -e COLUMNS=$COLUMNS -e LINES=$LINES -e TERM=$TERM \
   -v /var/run/docker.sock:/var/run/docker.sock \
   -v ${CURRENT_PATH}/data:/root/pai-deploy \
   -v ${CURRENT_PATH}/pai:/root/pai-deploy/pai \
   -v ${CURRENT_PATH}/kubespray:/root/pai-deploy/kubespray \
   -v ${CURRENT_PATH}/.kube:/root/.kube \
   --pid=host \
   --privileged=true \
   --net=host \
   --name=dev-box \
   ${HARBOR}/openpai/dev-box:${TAG}
}


USAGE(){
    msg="USAGE:\n./dev-box.sh [--rebuild | --restart]"
    echo -e "\033[31m$msg\033[0m"
}

action=$1
if   [[ $action == "--rebuild" ]];then
    rebuild
elif [[ $action == "--restart" ]];then
    restart
else
    USAGE
fi
