#!/bin/bash
set -e
CURRENT_PATH=`pwd`
PLUGINS_PATH="${CURRENT_PATH}/pai/contrib/"
HARBOR_ADD="192.168.21.228"
IMAGES_TAG="v0.17.0"

_set_yarn_registry(){
    yarn config set registry 'https://registry.npm.taobao.org'
}

_build_plugin_marketplace(){
    pushd ${PLUGINS_PATH}/marketplace/ > /dev/null
    line=`grep -n \"ordered-imports\" tslint.json | awk -F':' '{print $1}'`
    sed -i "${line}i \"jsx-no-multiline-js\": false," tslint.json
    yarn install
    yarn build
    git checkout -- tslint.json
    popd > /dev/null
}

_build_plugin_submitv2(){
    pushd ${PLUGINS_PATH}/submit-job-v2/ > /dev/null
    line=`grep -n \"ordered-imports\" tslint.json | awk -F':' '{print $1}'`
    sed -i "${line}i \"jsx-no-multiline-js\": false," tslint.json
    yarn install
    yarn build
    git checkout -- tslint.json
    popd > /dev/null
}

_build_docker_image(){
    cat > ${CURRENT_PATH}/webportal-plugins.Dockerfile << __EOF__
FROM centos/httpd:latest

RUN mkdir -p /var/www/html/marketplace/ \
    && mkdir -p /var/www/html/submit-job-v2/
COPY ./pai/contrib/marketplace/dist /var/www/html/marketplace/
COPY ./pai/contrib/submit-job-v2/dist /var/www/html/submit-job-v2/
__EOF__
    docker build -t openpai/webportal-plugins:${IMAGES_TAG} -f webportal-plugins.Dockerfile .
    docker tag openpai/webportal-plugins:${IMAGES_TAG} ${HARBOR_ADD}/openpai/webportal-plugins:${IMAGES_TAG}
    docker push ${HARBOR_ADD}/openpai/webportal-plugins:${IMAGES_TAG}
    rm -rf webportal-plugins.Dockerfile
}

_generate_k8s_yaml(){
cat > ${CURRENT_PATH}/webportal-plugins.yaml << __EOF__
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webportal-plugins
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webportal-plugins
  template:
    metadata:
      labels:
        app: webportal-plugins
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: pai-master
                operator: In
                values:
                - "true"
      containers:
      - name: webportal-plugins
        image: ${HARBOR_ADD}/openpai/webportal-plugins:${IMAGES_TAG}
        imagePullPolicy: Always
        ports:
        - containerPort: 80
          protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: webportal-plugins
  name: webportal-plugins-service
  namespace: default
spec:
  type: NodePort
  sessionAffinity: None
  externalTrafficPolicy: Cluster
  selector:
    app: webportal-plugins
  ports:
  - name: webportal-plugins
    protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 32767
__EOF__
}
_set_yarn_registry
_build_plugin_marketplace
_build_plugin_submitv2
_build_docker_image
_generate_k8s_yaml
