#include "audio_manager.h"
#include <Audio.h>
#include <atomic>
#include "driver/i2s_std.h"
#include "hal/es8311.h"

namespace audio
{
    // I2S-Pins laut LCDwiki
    static constexpr int PIN_MCLK = 17, PIN_BCLK = 18, PIN_LRCK = 21, PIN_DOUT = 15, PIN_DIN = 16;
    static constexpr int PIN_AMP_SHUTDOWN = 1; // SC8002B, LOW = Verstärker an

    struct Command
    {
        enum Type : uint8_t { PLAY, STOP, VOLUME, RECORD } type;
        fs::FS *fs;
        char path[96];
        uint8_t volume;
    };

    // Aufnahmeauftrag; der aufrufende Task wartet auf done
    struct RecordJob
    {
        int16_t *buf;
        size_t maxSamples;
        size_t samples;
        bool speech;
        SemaphoreHandle_t done;
    };
    static RecordJob *s_job = nullptr;
    static volatile bool s_recording = false;
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

    // Aufnahme mit 16 kHz, 16 Bit, mono. Der Player gibt dafür den I2S-Kanal frei (gleiche Taktleitungen).
    // Endet nach ~1 s Stille nach dem Sprechen, spätestens bei voller Länge; ohne Sprache nach 5 s.
    static void record(RecordJob &job)
    {
        delete s_audio; // gibt I2S0 frei
        s_audio = nullptr;
        amp(false);

        i2s_chan_handle_t rx = nullptr;
        i2s_chan_config_t cc = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
        i2s_std_config_t sc = {
            .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(16000), // MCLK = 256 x fs, passend zur ES8311-Einstellung
            .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
            .gpio_cfg = {.mclk = (gpio_num_t)PIN_MCLK, .bclk = (gpio_num_t)PIN_BCLK, .ws = (gpio_num_t)PIN_LRCK,
                         .dout = I2S_GPIO_UNUSED, .din = (gpio_num_t)PIN_DIN, .invert_flags = {}},
        };
        job.samples = 0;
        job.speech = false;
        if (i2s_new_channel(&cc, nullptr, &rx) == ESP_OK && i2s_channel_init_std_mode(rx, &sc) == ESP_OK &&
            i2s_channel_enable(rx) == ESP_OK)
        {
            static int16_t frame[2 * 320]; // 20 ms Stereo
            float noise = 0;               // Grundrauschen der ersten 300 ms
            int blocks = 0, quiet = 0, peakRms = 0;
            vTaskDelay(pdMS_TO_TICKS(60)); // Codec einschwingen lassen
            while (job.samples + 320 <= job.maxSamples)
            {
                size_t bytes = 0;
                if (i2s_channel_read(rx, frame, sizeof(frame), &bytes, 200) != ESP_OK)
                    break;
                const int n = bytes / 4;
                int64_t energy = 0;
                for (int i = 0; i < n; i++)
                {
                    const int16_t v = (frame[2 * i] >> 1) + (frame[2 * i + 1] >> 1); // Mittel aus beiden Kanälen
                    job.buf[job.samples++] = v;
                    energy += (int32_t)v * v;
                }
                const int rms = n ? (int)sqrtf((float)energy / n) : 0;
                peakRms = max(peakRms, rms);
                blocks++;

                // einfache Spracherkennung: deutlich über dem Grundrauschen = Sprache
                if (blocks <= 15)
                    noise = noise + (rms - noise) / blocks;
                else
                {
                    const bool loud = rms > noise * 2.5f + 40;
                    if (loud)
                    {
                        job.speech = true;
                        quiet = 0;
                    }
                    else if (job.speech && ++quiet >= 50) // 1 s Stille nach dem Sprechen
                        break;
                    if (!job.speech && blocks > 250) // 5 s ohne Sprache
                        break;
                }
            }
            Serial.printf("Aufnahme: %u Samples, Rauschen %.0f, Spitze %d, Sprache %s\n", (unsigned)job.samples,
                          noise, peakRms, job.speech ? "ja" : "nein");
            i2s_channel_disable(rx);
        }
        else
        {
            Serial.println("Aufnahme: I2S-Kanal konnte nicht angelegt werden");
        }
        if (rx)
            i2s_del_channel(rx);

        createPlayer(); // Wiedergabe wieder herstellen
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
                if (cmd.type == Command::RECORD)
                {
                    s_audio->stopSong();
                    s_playing = false;
                    record(*s_job);
                    xSemaphoreGive(s_job->done);
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

    size_t recordSpeech(int16_t *buf, size_t maxSamples, bool &speech)
    {
        RecordJob job = {buf, maxSamples, 0, false, xSemaphoreCreateBinary()};
        s_job = &job;
        s_recording = true;
        Command c = {Command::RECORD, nullptr, {}, 0};
        xQueueSend(s_queue, &c, portMAX_DELAY);
        xSemaphoreTake(job.done, portMAX_DELAY);
        vSemaphoreDelete(job.done);
        s_recording = false;
        s_job = nullptr;
        speech = job.speech;
        return job.samples;
    }

    bool isRecording() { return s_recording; }

    // Ein noch nicht bearbeiteter Befehl zählt als "läuft", damit ein frisch
    // gestarteter Azan nicht sofort als beendet erkannt wird.
    bool isPlaying() { return s_playing || s_pending > 0; }
    uint32_t elapsedSeconds() { return s_elapsed; }
    uint32_t durationSeconds() { return s_duration; }
}
