.PHONY: dev deploy

PORT ?= 8021

dev:
	@echo "Serving at http://localhost:$(PORT)"
	@python3 -m http.server $(PORT) 

deploy:
	git push dokku main
