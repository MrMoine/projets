import pyaudio
import requests
import json


CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 50000
RECORD_SECONDS = 3
BIT_DEPTH = 8


def getAudio():
	global CHUNK
	global FORMAT
	global CHANNELS
	global RATE
	global RECORD_SECONDS

	p = pyaudio.PyAudio()

	stream = p.open(format=FORMAT,
					channels=CHANNELS,
					rate=RATE,
					input=True,
					frames_per_buffer=CHUNK)

	print("* recording")

	file = open("test.raw", 'wb')
	for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
		data = stream.read(CHUNK)
		file.write(data)
		yield ""
	print("* recording over ")

	stream.stop_stream()
	stream.close()
	p.terminate()


header = {
	"Authorization": "Bearer L2WKPHAI5W6QJM73C2R7LBYPMIVBZBQJ",
	'Content-Type': f'audio/raw;encoding=signed-integer;bits={BIT_DEPTH};rate={RATE};endian=little',
	"Transfer-encoding": "chunked"
}

def rawFromFile():
	with open("test.raw", "rb") as f:
		for byte in f:
			yield byte
		print("over")



res = requests.post('https://api.wit.ai/speech',
                    headers=header, data=rawFromFile())
					
print(res.text)
