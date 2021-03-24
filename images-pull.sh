#set -e

HARBOR="192.168.24.21"
IMAGE_TAG="v1.5.0"
BASE_DIR=./tmp/images-collect/

rm -rf ${BASE_DIR}
mkdir -p ${BASE_DIR}
K8S_SERVICES="${BASE_DIR}/k8s.txt"
IMAGES_LIST="${BASE_DIR}/images.txt"

# 遍历k8s类型相关的服务
grep -nri service_type ./pai/src/ | grep -E 'k8s|common' > ${K8S_SERVICES}
grep -nriE 'k8s|common' ./pai/src/ | grep service.yaml >> ${K8S_SERVICES}

cat ${K8S_SERVICES} | awk -F'/' '{print $4}' | sort -u -o ${K8S_SERVICES}
for svc in `cat ${K8S_SERVICES}`;do
    echo "finding in ./pai/src/${svc} ..."
    find ./pai/src/${svc} -name '*.yaml' -o -name '*.yml' -o -name '*.template'| grep -v node_modules | xargs cat | grep image: >> ${IMAGES_LIST}
done

# 消除前缀
sed -i "s/{{ cluster_cfg\[\"cluster\"\]\[\"docker-registry\"\]\[\"prefix\"\] }}/docker.io\/openpai\//g" ${IMAGES_LIST}
sed -i "s/{{ cluster_cfg\['cluster'\]\['docker-registry'\]\['prefix'\] }}/docker.io\/openpai\//g" ${IMAGES_LIST}
sed -i "s/{{cluster_cfg\[\"cluster\"\]\[\"docker-registry\"\]\[\"prefix\"\]}}/docker.io\/openpai\//g" ${IMAGES_LIST}
sed -i "s/{{cluster_cfg\['cluster'\]\['docker-registry'\]\['prefix'\]}}/docker.io\/openpai\//g" ${IMAGES_LIST}
# 消除tag
sed -i "s/{{ cluster_cfg\['cluster'\]\['docker-registry'\]\['tag'\] }}/${IMAGE_TAG}/g" ${IMAGES_LIST}
sed -i "s/{{ cluster_cfg\[\"cluster\"\]\[\"docker-registry\"\]\[\"tag\"\] }}/${IMAGE_TAG}/g" ${IMAGES_LIST}
sed -i "s/{{cluster_cfg\[\"cluster\"\]\[\"docker-registry\"\]\[\"tag\"\]}}/${IMAGE_TAG}/g" ${IMAGES_LIST}
sed -i "s/{{cluster_cfg\['cluster'\]\['docker-registry'\]\['tag'\]}}/${IMAGE_TAG}/g" ${IMAGES_LIST}
# 消除空格
sed -i 's/ //g' ${IMAGES_LIST}
# 去掉image:
sed -i 's/^image://g' ${IMAGES_LIST}
sed -i 's/^-image://g' ${IMAGES_LIST}

# 增加额外的镜像
echo "docker.io/openpai/dev-box:latest" >> ${IMAGES_LIST}
echo "docker.io/openpai/openpai-runtime:${IMAGE_TAG}" >> ${IMAGES_LIST}

# 排序/去重
sort -u ${IMAGES_LIST} -o ./images.txt

# 过滤掉docker.io
sed -i 's/docker.io\///g' ./images.txt

# 继续拉取镜像
read -p "Start to pull images ?(Y|N) :" yn
if [[ $yn != "Y" ]];then
    exit
fi
# 拉取镜像
for line in `cat ./images.txt`;do
    echo "pulling $line ...."
    docker pull $line
    if [[ $line =~ 'openpai' ]];then
        docker tag $line ${HARBOR}/$line
        docker push ${HARBOR}/$line
    else
        docker tag $line ${HARBOR}/openpai/$line
        docker push ${HARBOR}/openpai/$line
    fi
done
