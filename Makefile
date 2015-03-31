CONVERT2PY = yaksok/convert2py
CONVERT2JS = yaksok/convert2js

all:python3/game.py python3/draw.py
gh-pages:
	mkdir -p gh-pages
python3/game.py: gh-pages 게임.yak
	$(CONVERT2PY) 게임.yak > python3/game.py
	$(CONVERT2JS) 게임.yak > gh-pages/game.js
python3/draw.py: gh-pages 화면.yak
	$(CONVERT2PY) 화면.yak > python3/draw.py
	$(CONVERT2JS) 화면.yak > gh-pages/draw.js
run: all
	python3 python3/main.py
clean:
	rm -f python3/game.py python3/draw.py gh-pages/game.js gh-pages/draw.js
