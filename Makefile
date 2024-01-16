ifneq "$(wildcard Makefile.local)" ""
include Makefile.local
endif


all:
	@echo make sign
	@echo make run-ext

build:
	mkdir -p release
	-rm -f release/y.xpi
	zip -r -FS release/y.xpi . -x				\
		'test/*' 'release/*' '.git/*' '*~' 

sign:
	web-ext sign -s src --api-key=$(JWT_ISSUER)		\
			--api-secret=$(JWT_SECRET)		\
			--channel "unlisted"			\
			-i Makefile.local -i ".git" -i '*~'	\
			-i test	-i server			\
			-i 'options/*~' -i test


run-ext:
	web-ext run -s src --devtools --keep-profile-changes		\
		-p ~/.cache/mozilla/firefox/web-ext/ --profile-create-if-missing
