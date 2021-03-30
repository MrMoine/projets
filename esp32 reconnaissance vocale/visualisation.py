import matplotlib.pyplot as plt

f = open("./test.raw", "rb")
time = 0
x = []
y = []
while 1:
	byte_s = f.read(1)
	if not byte_s:
		break
	byte = byte_s[0]
	x += [time]
	y += [byte]
	time += 1

plt.plot(x,y)
plt.ylim(0, 400)
plt.xlabel('temps')
plt.ylabel('intensité')

plt.title('debug')

plt.show()
