wavFile='./user-define.yml'
file = open(wavFile, 'rb')
file.seek(0, 2)
audioLen = file.tell()
print(audioLen)
file.seek(0,0)
audioLen2 = file.tell()
print(audioLen2)
