# fix for archlinux TODO: am i doing this wrong?
ifneq ("$(wildcard /usr/lib/emscripten/em++)","")
	export PATH := $(PATH):/usr/lib/emscripten
endif

export LDFLAGS += -s EXPORTED_RUNTIME_METHODS="['UTF8ToString', 'writeAsciiToMemory']"

libopenmpt.js: openmpt
	cd openmpt && \
	make CONFIG=emscripten EMSCRIPTEN_TARGET=audioworkletprocessor TEST=0 EXAMPLES=0
	cp openmpt/bin/libopenmpt.js .

openmpt:
	git clone --depth 1 https://github.com/OpenMPT/openmpt

firefix: libopenmpt.js
	# TODO: do we really need firefix.diff?
	cd openmpt && \
	git restore . && \
	git apply ../firefix.diff && \
	rm bin/libopenmpt.js; \
	make CONFIG=emscripten EMSCRIPTEN_TARGET=audioworkletprocessor TEST=0 EXAMPLES=0 && \
	git restore .
	cp openmpt/bin/libopenmpt.js mod-player.js
	sed 's/export default/const MSGTYPE =/' msg_types.js >> mod-player.js
	echo "const lompt = libopenmpt();" >> mod-player.js
	tail -n +4 mod-player.src.js >> mod-player.js

clean:
	rm libopenmpt.js
	cd openmpt && make clean
