#!/bin/bash

DB_DIR="/filebrowser"
CONFIG_DIR="/filebrowser"
MANAGED_DIR="/shares"
IMAGE="ctbri/filebrowser:latest"

cat << __EOT__ > /usr/local/bin/filebrowser
#!/bin/bash

/usr/bin/docker run \
--restart=on-failure:5 \
-v ${MANAGED_DIR}:/srv \
-v ${DB_DIR}/filebrowser.db:/database.db:rw \
-v ${CONFIG_DIR}/.filebrowser.json:/.filebrowser.json \
-p 9000:80 \
--privileged=true \
--memory=512M \
--name=filebrowser \
$IMAGE
__EOT__
chmod 755 /usr/local/bin/filebrowser

cat << __EOT__ > /etc/systemd/system/filebrowser.service
[Unit]
Description=filebrowser docker wrapper
Wants=docker.socket
After=docker.service

[Service]
User=root
PermissionsStartOnly=true
ExecStart=/usr/local/bin/filebrowser
ExecStartPre=-/usr/bin/docker rm -f filebrowser
ExecStop=/usr/bin/docker stop filebrowser
Restart=always
RestartSec=15s
TimeoutStartSec=30s

[Install]
WantedBy=multi-user.target
__EOT__
systemctl daemon-reload
systemctl restart filebrowser.service
