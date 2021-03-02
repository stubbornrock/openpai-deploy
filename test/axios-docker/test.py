import requests
url = "http://192.168.24.21/c/login"
payload='principal=admin&password=CStest123!%40%23'
headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
}
response = requests.request("POST", url, headers=headers, data=payload, verify=False)
print(response.text)
