.PHONY: check fix

check:
	npm run lint:md

fix:
	npm run lint:md:fix
