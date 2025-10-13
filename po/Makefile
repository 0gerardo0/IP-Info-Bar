GETTEXT_PACKAGE = ip-info-bar

UUID = ip-info-bar@gerardo.github.io

POTFILES = $(wildcard ../*.js)

%.pot: $(POTFILES)
	xgettext --from-code=UTF-8 --add-comments=Translators -o $@ $^

pot: $(GETTEXT_PACKAGE).pot

update-po: pot
	for lang in *.po; do \
		msgmerge -U $$lang $(GETTEXT_PACKAGE).pot; \
	done

clean:
	rm -f $(GETTEXT_PACKAGE).pot
	rm -f *.po~
