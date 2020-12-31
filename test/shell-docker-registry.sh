token=`echo -n "Admin:Harbor12345" | base64`
echo "TOKEN:"$token
curl -v -H "Authorization: Basic $token" -X GET http://192.168.19.118/v2/_catalog
