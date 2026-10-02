#include "audio_manager.h"
#include <Audio.h>
#include <atomic>
#include "hal/es8311.h"

namespace audio
{
    // I2S-Pins laut LCDwiki
    static constexpr int PIN_MCLK = 17, PIN_BCLK = 18, PIN_LRCK = 21, PIN_DOUT = 15;
    static constexpr int PIN_AMP_SHUTDOWN = 1; // SC8002B, LOW = Verstärker an

    struct Command
    {
        enum Type : uint8_t { PLAY, STOP, VOLUME } type;
        fs::FS *fs;
        char path[96];
        uint8_t volume;
    };

    static uint8_t s_volume = 15;

    static Audio *s_audio;
    static QueueHandle_t s_queue;
    static volatile bool s_playing = false;
    static std::atomic<int> s_pending{0}; // gesendete, noch nicht bearbeitete Befehle
    static volatile uint32_t s_elapsed = 0, s_duration = 0;

    static void amp(bool on) { digitalWrite(PIN_AMP_SHUTDOWN, on ? LOW : HIGH); }

    static void createPlayer()
    {
        s_audio = new Audio();
        s_audio->setPinout(PIN_BCLK, PIN_LRCK, PIN_DOUT, PIN_MCLK);
        s_audio->setVolume(s_volume);
    }

    static void task(void *)
    {
        Command cmd;
        for (;;)
        {
            while (xQueueReceive(s_queue, &cmd, 0) == pdTRUE)
            {
                if (cmd.type == Command::VOLUME)
                {
                    s_volume = cmd.volume;
                    s_audio->setVolume(cmd.volume); // zählt nicht als offener Abspielbefehl
                    continue;
                }
                s_audio->stopSong();
                if (cmd.type == Command::PLAY)
                {
                    s_elapsed = s_duration = 0;
                    amp(true);
                    s_playing = s_audio->connecttoFS(*cmd.fs, cmd.path);
                    if (!s_playing)
                        Serial.printf("Audio: kann %s nicht abspielen\n", cmd.path);
                }
                else
                {
                    s_playing = false;
                }
                s_pending--;
            }

            if (s_playing)
            {
                s_audio->loop();
                s_elapsed = s_audio->getAudioCurrentTime();
                s_duration = s_audio->getAudioFileDuration();
                if (!s_audio->isRunning())
                    s_playing = false; // Datei zu Ende
            }
            if (!s_playing)
                amp(false);

            vTaskDelay(1);
        }
    }

    bool begin(uint8_t decoderVolume, uint8_t codecVolume)
    {
        pinMode(PIN_AMP_SHUTDOWN, OUTPUT);
        amp(false);

        const bool codecOk = es8311::begin();
        if (codecOk)
            es8311::setVolume(codecVolume);
        Serial.printf("Audio: ES8311 %s\n", codecOk ? "OK" : "antwortet nicht");

        s_volume = decoderVolume;
        createPlayer();

        s_queue = xQueueCreate(4, sizeof(Command));
        xTaskCreatePinnedToCore(task, "audio", 8192, nullptr, 3, nullptr, 0);
        return codecOk;
    }

    void play(fs::FS &fs, const char *path)
    {
        Command c = {Command::PLAY, &fs, {}, 0};
        strlcpy(c.path, path, sizeof(c.path));
        s_pending++;
        xQueueSend(s_queue, &c, portMAX_DELAY);
    }

    void stop()
    {
        Command c = {Command::STOP, nullptr, {}, 0};
        s_pending++;
        xQueueSend(s_queue, &c, portMAX_DELAY);
    }

    void setVolume(uint8_t volume)
    {
        Command c = {Command::VOLUME, nullptr, {}, (uint8_t)min<int>(volume, 21)};
        xQueueSend(s_queue, &c, portMAX_DELAY);
    }

    // Ein noch nicht bearbeiteter Befehl zählt als "läuft", damit ein frisch
    // gestarteter Azan nicht sofort als beendet erkannt wird.
    bool isPlaying() { return s_playing || s_pending > 0; }
    uint32_t elapsedSeconds() { return s_elapsed; }
    uint32_t durationSeconds() { return s_duration; }
}
