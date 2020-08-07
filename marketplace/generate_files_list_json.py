#!/usr/bin/python
# -*- coding: UTF-8 -*-

import json
import urllib
import urllib2
from bs4 import BeautifulSoup

REPO_URL="http://192.168.19.38/marketplace-v2"

def _get_file_list_from_http(t_type):
    URL="{0}/{1}".format(REPO_URL,t_type)
    req = urllib2.Request(URL)
    res = urllib2.urlopen(req)
    return res.read()

def _update_files_meta(data):
    with open('./templates.list','w') as f:
        f.write(json.dumps(data))

def _generate_metadata(t_type):
    html = _get_file_list_from_http(t_type)
    bs = BeautifulSoup(html, "html.parser")
    metas = []
    for f in bs.find_all("a"):
        f_name = f["href"]
        if f_name.endswith("yaml") or f_name.endswith("yml"):
            f_url = "{0}/{1}/{2}".format(REPO_URL,t_type,f_name)
            f_type = "file"
            metas.append({"name":f_name, "type":f_type, "template":t_type, "download_url":f_url})
    return metas

if __name__ == "__main__":
    TEMPLATE_TYPES=['job','application']
    metadatas = []
    for t_type in TEMPLATE_TYPES:
        metadatas.extend(_generate_metadata(t_type))
    _update_files_meta(metadatas)
