all:
	@echo make build

build:
	mkdir -p release
	zip -r release/y.xpi . -x 'test/*' 'release/*' '.git/*' '*~' 'PptxGenJS/demos/*'
