#include "display_port.h"
#include "esp_heap_caps.h"
#include "lcd_st77922.h"
#include "touch_st7123.h"

namespace display
{
    static constexpr uint16_t BUF_LINES = 40; // LVGL-Zeichenpuffer: 480 x 40 Pixel
    static constexpr size_t ROT_PX = 32 * BUF_LINES; // Puffer für einen gedrehten Streifen

    // LVGL zeichnet im Querformat, das Panel bleibt im Hochformat (320x480).
    // Die Drehung passiert in Software, weil der ST77922 MADCTL nur teilweise umsetzt.
    // Steht das Bild auf dem Kopf: auf true setzen.
    static constexpr bool FLIP_180 = false;

    static uint16_t *s_rotBuf; // gedrehter Streifen in Panel-Ausrichtung (DMA-fähig)

    // Querformat (X, Y) -> Panel (nx, ny)
    static inline uint16_t toNativeX(int16_t X, int16_t Y) { return FLIP_180 ? Y : lcd::NATIVE_W - 1 - Y; }
    static inline uint16_t toNativeY(int16_t X, int16_t Y) { return FLIP_180 ? lcd::NATIVE_H - 1 - X : X; }

    static void flushCb(lv_disp_drv_t *drv, const lv_area_t *a, lv_color_t *px)
    {
        const int w = a->x2 - a->x1 + 1; // Breite im Querformat = Höhe im Panel
        const int h = a->y2 - a->y1 + 1; // Höhe im Querformat = Breite im Panel
        const uint16_t *src = (const uint16_t *)px;

        // Panel-Fenster: Spalten aus Y, Zeilen aus X
        const uint16_t nx0 = min(toNativeX(a->x1, a->y1), toNativeX(a->x2, a->y2));
        const uint16_t ny0 = min(toNativeY(a->x1, a->y1), toNativeY(a->x2, a->y2));

        // In Streifen drehen und senden, damit der Puffer klein bleibt. Schmale Bereiche
        // können bis zu 320 Pixel hoch sein, deshalb hängt die Streifenbreite von h ab.
        const int stripRows = ROT_PX / h; // h <= 320, also mindestens 4
        for (int r0 = 0; r0 < w; r0 += stripRows)
        {
            const int rows = min(stripRows, w - r0);
            for (int r = 0; r < rows; r++) // Panel-Zeile
                for (int c = 0; c < h; c++) // Panel-Spalte
                {
                    const int X = FLIP_180 ? a->x2 - (r0 + r) : a->x1 + r0 + r;
                    const int Y = FLIP_180 ? a->y1 + c : a->y2 - c;
                    s_rotBuf[r * h + c] = src[(Y - a->y1) * w + (X - a->x1)];
                }
            lcd::pushPixels(nx0, ny0 + r0, h, rows, s_rotBuf);
        }
        lv_disp_flush_ready(drv);
    }

    // Das Panel schreibt nur ganze 4-Pixel-Spalten. Panel-Spalten entsprechen
    // den Querformat-Zeilen, also Y ausrichten (320 ist durch 4 teilbar).
    static void rounderCb(lv_disp_drv_t *, lv_area_t *a)
    {
        a->y1 &= ~3;
        a->y2 |= 3;
    }

    static void touchCb(lv_indev_drv_t *, lv_indev_data_t *data)
    {
        uint16_t nx, ny;
        if (touch::read(nx, ny))
        {
            // Umkehrung von toNativeX/toNativeY
            data->point.x = FLIP_180 ? lcd::NATIVE_H - 1 - ny : ny;
            data->point.y = FLIP_180 ? nx : lcd::NATIVE_W - 1 - nx;
            data->state = LV_INDEV_STATE_PR;
        }
        else
        {
            data->state = LV_INDEV_STATE_REL;
        }
    }

    bool begin()
    {
        lcd::begin();
        bool touchOk = touch::begin();

        lv_init();

        static lv_disp_draw_buf_t drawBuf;
        const size_t bufPx = WIDTH * BUF_LINES;
        // Ein Puffer genügt: die Übertragung ist synchron. Er liegt im PSRAM, damit der knappe
        // interne RAM für TLS (OpenAI, Gebetszeiten) frei bleibt; gesendet wird aus s_rotBuf (intern, DMA).
        auto *buf = (lv_color_t *)heap_caps_malloc(bufPx * sizeof(lv_color_t), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        s_rotBuf = (uint16_t *)heap_caps_malloc(ROT_PX * sizeof(uint16_t), MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL);
        lv_disp_draw_buf_init(&drawBuf, buf, nullptr, bufPx);

        static lv_disp_drv_t dispDrv;
        lv_disp_drv_init(&dispDrv);
        dispDrv.hor_res = WIDTH;
        dispDrv.ver_res = HEIGHT;
        dispDrv.flush_cb = flushCb;
        dispDrv.rounder_cb = rounderCb;
        dispDrv.draw_buf = &drawBuf;
        lv_disp_drv_register(&dispDrv);

        static lv_indev_drv_t indevDrv;
        lv_indev_drv_init(&indevDrv);
        indevDrv.type = LV_INDEV_TYPE_POINTER;
        indevDrv.read_cb = touchCb;
        lv_indev_drv_register(&indevDrv);

        return touchOk;
    }
}
