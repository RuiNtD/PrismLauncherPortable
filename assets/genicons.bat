inkscape -w 16 -h 16 -o appicon_16.png org.prismlauncher.PrismLauncher.svg
inkscape -w 32 -h 32 -o appicon_32.png org.prismlauncher.PrismLauncher.svg
inkscape -w 48 -h 48 -o appicon_48.png org.prismlauncher.PrismLauncher.svg
inkscape -w 75 -h 75 -o appicon_75.png org.prismlauncher.PrismLauncher.svg
inkscape -w 128 -h 128 -o appicon_128.png org.prismlauncher.PrismLauncher.svg
inkscape -w 256 -h 256 -o appicon_256.png org.prismlauncher.PrismLauncher.svg

magick convert appicon_16.png appicon_32.png appicon_48.png appicon_256.png appicon.ico

@echo off
del appicon_48.png
echo.

move /Y appicon* ..\PrismLauncherPortable\App\AppInfo
pause
