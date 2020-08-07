#!/bin/bash
CURRENT_PATH=`pwd`
IMAGES_TAG="ctbriv1.0.0"

cat > ${CURRENT_PATH}/dev-box.Dockerfile << __EOF__
FROM openpai/dev-box:v1.0.0
COPY kubespray/requirements.txt /tmp/
RUN apt-get -y update \
    && apt-get -y install software-properties-common python3 python3-dev \
    && curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py \
    && python3 get-pip.py \
    && pip3 install paramiko \
    && pip3 install jinja2 \
    && apt-get -y install sshpass \
    && pip3 install -r /tmp/requirements.txt
__EOF__
docker build -t openpai/dev-box:${IMAGES_TAG} -f dev-box.Dockerfile .
rm -rf dev-box.Dockerfile
