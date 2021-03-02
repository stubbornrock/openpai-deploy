#!/bin/bash
PWD=`pwd`
BUILD_DIR=${PWD}/pai/build/
TMP_DIR=${PWD}/tmp
COMPONENT_DIR=${PWD}/pai/src/

#validate
USAGE(){
   echo "./pai-build.sh [servicename]"
}
if [[ $# -ne 1 ]];then
    USAGE
    exit 1
fi
service=$1

#prepare
mkdir -p ${TMP_DIR}
tag=`date +"%Y%m%d"`
cp pai-build.yaml ${TMP_DIR}/services-configuration.yaml
sed -i "s/tag: .*/tag: ctbriv1-${tag}/g" ${TMP_DIR}/services-configuration.yaml

#build
pushd ${BUILD_DIR} > /dev/null
./pai_build.py build -c ${TMP_DIR} -s ${service}
./pai_build.py push  -c ${TMP_DIR} -i ${service}
popd > /dev/null

#push
docker tag ${service}:latest 192.168.19.31/teleaip/${service}:ctbriv1-${tag}
docker push 192.168.19.31/teleaip/${service}:ctbriv1-${tag}
