// Öffentlicher Schlüssel für Selbst-Updates (ECDSA P-256). Nur Verzeichnisse, die mit dem
// passenden privaten Schlüssel (liegt nur beim Herausgeber, nicht im Repository) signiert sind,
// werden installiert.
#pragma once
static const char OTA_PUBLIC_KEY[] =
"-----BEGIN PUBLIC KEY-----\n"
"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE1clsvBLgFI/mh0pZO0vVCR3DdxaN\n"
"5DTq6vlVxVjQxx9OaQkrjoSTK+NM2rKmQPQbV8m3bVzl1C+G5jcGeG+4NQ==\n"
"-----END PUBLIC KEY-----\n";
