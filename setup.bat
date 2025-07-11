@echo off

:: KARAKTER KODLAMA HATASINI DUZELTMEk ICIN BU KOMUT SARTTIR!
chcp 65001 >nul

:: Rengi Magenta (Mor/Pembe) yap
color 0d

:: ASCII Yazisini Ekrana Yazdir
echo reallykraak

:: Ana metinler icin rengi tekrar Yesil yap
color 0a
title reallykrak - Setup

:choice
echo Do you confirm that you have filled out the config file? (Y/N)
set /p confirm=Y/N:
if /I "%confirm%"=="Y" goto information
if /I "%confirm%"=="N" goto end
cls

:: Hata Mesaji Bolumu
color 0c
echo Please enter Y or N.
timeout /t 2 >nul
color 0a
goto choice

:information
cls
echo The installation may take a long time. Please wait patiently.
echo.
echo The window will close automatically when the installation is complete.
echo.
echo You can start the bot via start.bat.
echo.
echo Press any key to confirm you understand.
pause >nul
goto installation

:installation
cls
echo Installation has started, please wait...
npm install
exit

:end
cls
:: Iptal Mesaji Bolumu
color 0c
echo Installation canceled. Press any key to close the window.
pause >nul
exit