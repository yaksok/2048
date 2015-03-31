CONVERT2PY = yaksok/convert2py
CONVERT2JS = yaksok/convert2js

all:game.py draw.py
gh-pages:
	mkdir -p gh-pages
game.py: gh-pages 게임.yak
	$(CONVERT2PY) 게임.yak > game.py
	$(CONVERT2JS) 게임.yak > gh-pages/game.js
draw.py: gh-pages 화면.yak
	$(CONVERT2PY) 화면.yak > draw.py
	$(CONVERT2JS) 화면.yak > gh-pages/draw.js
run: all
	python3 main.py
clean:
	rm -f game.py draw.py gh-pages/game.js gh-pages/draw.js
