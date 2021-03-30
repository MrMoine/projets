import socket
import ssl
import time


def requestLog(ssock, string):
	print(string, end="")
	ssock.sendall(bytes(string, "ascii"))


hostname = 'api.wit.ai'
endpoint = "/speech"
token = "YSPRKSUB6I3NEQ6U6WTH5URHRZXSEZ45"
context = ssl.create_default_context()
BIT_DEPTH = 8
RATE = 50000
f = open("./main/test.raw", "rb")
buffers = []
while True:
	buffer = f.read(RATE)
	if not len(buffer):  # si le buffer est vide (on a fini de lire le fichier)
		break
	else:
		buffers.append(buffer)


with socket.create_connection((hostname, 443)) as sock:
	with context.wrap_socket(sock, server_hostname=hostname) as ssock:
		requestLog(ssock,"POST " + endpoint + " HTTP/1.1\r\n")
		requestLog(ssock,"Host: " + hostname + "\r\n")
		requestLog(ssock,"Authorization: Bearer " + token + "\r\n")
		requestLog(ssock,f'Content-Type: audio/raw;encoding=signed-integer;bits={BIT_DEPTH};rate={RATE};endian=little\r\n')
		requestLog(ssock,"User-Agent: Mozilla/5.0\r\n")
		requestLog(ssock,"Transfer-Encoding: chunked\r\n")
		requestLog(ssock,"\r\n")

		for buffer in buffers:
			hexStr =hex(len(buffer))[2:]
			requestLog(ssock,hexStr)
			requestLog(ssock,"\r\n")
			ssock.sendall(buffer)
			print("<buffer content>")
			requestLog(ssock,"\r\n")


		requestLog(ssock,"0\r\n")
		requestLog(ssock,"\r\n")


