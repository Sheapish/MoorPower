## Setup Prior to Exhibition
1. Extensions to install in VSC: PlatformIO, ESP-IDF: Explorer
2. Download the lastest version of the SparkFun ICM-20948 Arduino Library from github
3. File Structure:
IMU_method2 -- lib -- SparkFun ICM-20948 Arduino Library

            -- data -- images -- "up to date MoorPower logo" save it as "carnegie_logo_long.png
   
                    -- index.html
   
                    -- script.js
   
                    -- style.css
   
            -- src -- main.cpp
   
            -- platformio.ini
   
## Setup at the Exhibition
1. Connect display computer to the exhibition centre wifi, or if that does not exist, a hotspot
2. Plug-in the esp32 to the computer, using a data transfer micro USB
3. Open IMU_method2 in VSC (File -> Open Folder -> IMU_method2)
4. Navigate in the VSC left panel: src -> main.cpp. Make sure to connect the ESP32 to the same wifi
network as the display. Edit wifi details accordingly in lines 10-11 of main.cpp
5. Upload main.cpp to the ESP32 (CTRL+ALT+U)
6. Once uploaded, open the VSC serial monitor (CTRL+ALT+S), and it should display something similar
to the following; IMU connected. Connecting to WiFi... ... WiFi connected. IP: 172.16.94.130
This IP address is where the website is displayed, so to view the page enter http://<IP address>/
7. F11 for fullscreen, F5 to refresh
## Editing the webpage
Make your edits to files, then save
Click PlatformIO icon (Alien head on the left sidebar) -> esp32dev -> Platform -> Upload Filestystem Image
Wait whilst the code uploads to the ESP32
