ifneq "$(wildcard Makefile.local)" ""
include Makefile.local
endif


all:
	@echo make sign

build:
	mkdir -p release
	-rm -f release/y.xpi
	zip -r -FS release/y.xpi . -x						\
		'test/*' 'release/*' '.git/*' '*~' 'PptxGenJS/demos/*'		\
		'pack/*'

sign:
	web-ext sign --api-key=$(JWT_ISSUER)			\
			--api-secret=$(JWT_SECRET)		\
			-i Makefile.local -i ".git" -i '*~'	\
			-i 'options/*~' -i test			\
			-i 'PptxGenJS/demos' -i pack

#			--channel "unlisted"			\
#			--use-submission-api			\

run-ext:
	web-ext run --devtools --keep-profile-changes
