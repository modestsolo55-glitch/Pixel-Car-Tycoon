#!/bin/sh
# Baut AutoTycoon.html aus den Quelldateien in src/ (eine einzige HTML-Datei)
cd "$(dirname "$0")"
cat src/00_head.html src/01_util.js src/02_data.js src/02b_bodies.js src/02c_carart.js src/03_state.js src/04_carsprite.js src/05_scenes.js \
    src/05b_enginebay.js src/06_economy.js src/07_ui_core.js src/08_ui_design.js src/05c_garagedeco.js src/08b_engines.js src/09_ui_mgmt.js src/09b_salvage.js src/09c_extras.js src/09d_rivals.js src/09e_league.js src/09f_tuning.js src/09g_shop.js src/09h_auth.js src/09j_menu.js src/09k_goals.js src/10_race.js src/10b_race_plus.js src/10d_weather.js src/10e_samui.js src/10f_themes.js src/10h_japan_hd.js src/10k_cinema.js src/10m_cruise.js src/10c_revbox.js src/09l_carshow.js src/09m_title.js src/11_three.js \
    src/12_main.js src/99_tail.html > AutoTycoon.html
echo "AutoTycoon.html: $(wc -c < AutoTycoon.html) Bytes"
cp AutoTycoon.html index.html                # Startseite für GitHub Pages
