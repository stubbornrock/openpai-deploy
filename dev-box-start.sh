#!/bin/bash
CURRENT_PATH=`pwd`
mkdir -p ${CURRENT_PATH}/data/pathConfiguration
mkdir -p ${CURRENT_PATH}/data/pathHadoop
#-v ${CURRENT_PATH}/data/pathConfiguration:/cluster-configuration \
#-v ${CURRENT_PATH}/data/pathHadoop:/hadoop-binary \
#-v ${CURRENT_PATH}/.kube:/root/.kube \

TAG="ctbriv1.0.0"

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
   192.168.21.228/openpai/dev-box:${TAG}
