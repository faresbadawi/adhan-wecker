#!/usr/bin/env bash
# Baut die Android-App (APK) ohne Gradle direkt mit den Android-Build-Tools.
# Voraussetzungen: JDK 21 in ~/.local/jdk, Android SDK in ~/Android/Sdk (platforms;android-36, build-tools;36.1.0).
# Signierschlüssel: ~/.config/azan-wecker/release.jks (wird beim ersten Lauf angelegt, NICHT ins Git).
# Ergebnis: build/Bilal.apk
set -euo pipefail
cd "$(dirname "$0")"
VERSION_CODE=${VERSION_CODE:-4}
VERSION_NAME=${VERSION_NAME:-2.1}
export JAVA_HOME=$(ls -d ~/.local/jdk/jdk-21* | head -1)
export PATH=$JAVA_HOME/bin:$PATH
SDK=~/Android/Sdk
BT=$SDK/build-tools/36.1.0
JAR=$SDK/platforms/android-36/android.jar
KS_DIR=~/.config/azan-wecker
KS=$KS_DIR/release.jks

rm -rf build && mkdir -p build/assets/www build/gen build/classes build/dex build/res/mipmap-xxxhdpi build/res/mipmap-xxhdpi build/res/mipmap-xhdpi build/res/mipmap-hdpi build/res/mipmap-mdpi

# Symbol in den üblichen Größen (aus dem App-Symbol der Web-App); Pillow aus der Projekt-venv
PY_PIL=${PY_PIL:-$HOME/.cache/azan-clock-venv/bin/python}
"$PY_PIL" - <<'PY'
from PIL import Image
src = Image.open('app/src/main/res/drawable/ic_launcher.png').convert('RGBA')
for d, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    src.resize((s, s), Image.LANCZOS).save(f'build/res/mipmap-{d}/ic_launcher.png')
PY
cp -r app/src/main/res/values* app/src/main/res/layout app/src/main/res/xml build/res/
mkdir -p build/res/drawable && cp app/src/main/res/drawable/*.xml build/res/drawable/

# Oberfläche für den Betrieb ohne Uhr ins Bündel (assets/www) und die Azan-Stimmen (assets/azans)
( cd ../webapp && npx vite build --mode app --outDir "$OLDPWD/build/assets/www" --emptyOutDir >/dev/null )
rm -rf build/assets/www/bg build/assets/www/app
cp -r ../muezzins build/assets/azans && rm -f build/assets/azans/*.md
sed 's#@drawable/ic_launcher#@mipmap/ic_launcher#g' app/src/main/AndroidManifest.xml > build/AndroidManifest.xml

"$BT/aapt2" compile --dir build/res -o build/res.zip
"$BT/aapt2" link -o build/base.apk -I "$JAR" --manifest build/AndroidManifest.xml -A build/assets build/res.zip \
  --java build/gen --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME"

javac -source 11 -target 11 -Xlint:-options -encoding UTF-8 -classpath "$JAR" -d build/classes \
  $(find build/gen app/src/main/java -name '*.java')
"$BT/d8" --min-api 24 --lib "$JAR" --output build/dex $(find build/classes -name '*.class')

python3 - <<'PY'
import zipfile, shutil
shutil.copy('build/base.apk', 'build/unaligned.apk')
with zipfile.ZipFile('build/unaligned.apk', 'a') as z:
    z.write('build/dex/classes.dex', 'classes.dex')
PY
"$BT/zipalign" -f -p 4 build/unaligned.apk build/aligned.apk

if [ ! -f "$KS" ]; then
  mkdir -p "$KS_DIR" && chmod 700 "$KS_DIR"
  PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(18))")
  echo "$PASS" > "$KS_DIR/release.pass" && chmod 600 "$KS_DIR/release.pass"
  keytool -genkeypair -keystore "$KS" -storepass "$PASS" -keypass "$PASS" -alias azan -keyalg RSA -keysize 3072 \
    -validity 20000 -dname "CN=Smart Azan Wecker" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass file:"$KS_DIR/release.pass" --ks-key-alias azan \
  --out build/Bilal.apk build/aligned.apk
"$BT/apksigner" verify build/Bilal.apk
ls -la build/Bilal.apk
