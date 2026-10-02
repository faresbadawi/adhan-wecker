// Sprachassistent auf Arabisch über OpenAI:
//   Mikrofon -> Spracherkennung (transcriptions) -> Antwort (chat completions, mit Gebetszeiten,
//   Datum, Uhrzeit und Wetter als Kontext und einer Wetterabfrage für andere Städte) -> Sprachausgabe (speech).
// Läuft in einem eigenen Task; der API-Schlüssel liegt nur im NVS der Uhr.
#pragma once
#include <Arduino.h>

namespace assistant
{
    enum class State : uint8_t
    {
        IDLE,
        LISTENING, // Mikrofon nimmt auf
        THINKING,  // Spracherkennung und Antwort
        SPEAKING,  // Antwort wird abgespielt
        ANSWER,    // Antwort fertig (Text bleibt sichtbar)
        ERROR,
    };

    struct Status
    {
        State state = State::IDLE;
        String question, answer, error;
        uint32_t version = 0; // steigt bei jeder Änderung
    };

    struct Config
    {
        String chatModel = "gpt-4o-mini";
        String sttModel = "whisper-1";
        String ttsModel = "tts-1";
        String voice = "alloy";
    };

    void begin();

    // Frage per Mikrofon (Antippen des Mikrofon-Symbols) oder als Text (Weboberfläche)
    bool listen();
    bool ask(const String &text);
    // Ansage abbrechen bzw. Ergebnis verwerfen
    void dismiss();

    Status status();
    uint32_t version(); // steigt bei jeder Statusänderung (billig abzufragen)

    bool hasKey();
    String keyHint(); // nur die letzten 4 Zeichen
    void setKey(const String &key);
    Config config();
    void setConfig(const Config &c);
}
