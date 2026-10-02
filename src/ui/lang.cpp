#include "lang.h"
#include <Preferences.h>
#include <string.h>

namespace lang
{
    static const char *const CODES[] = {"ar", "de", "en"};
    static Lang s_lang = Lang::AR;

    static int indexOf(const char *code)
    {
        for (int i = 0; i < 3; i++)
            if (strcmp(code, CODES[i]) == 0)
                return i;
        return -1;
    }

    void begin()
    {
        Preferences p;
        p.begin("web", true); // gemeinsam mit der Web-App
        const int i = indexOf(p.getString("lang", "ar").c_str());
        p.end();
        s_lang = i < 0 ? Lang::AR : (Lang)i;
    }

    Lang get() { return s_lang; }
    const char *code() { return CODES[(int)s_lang]; }
    bool rtl() { return s_lang == Lang::AR; }

    const lv_img_dsc_t *text(int id) { return ui_texts[(int)s_lang][id < 0 || id >= TXT_COUNT ? 0 : id]; }

    bool save(const char *code)
    {
        if (indexOf(code) < 0)
            return false;
        Preferences p;
        p.begin("web", false);
        p.putString("lang", code);
        p.end();
        return true;
    }
}
